import { Keypair, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount } from "@solana/spl-token";
import bs58 from "bs58";
import CryptoJS from "crypto-js";
import pg from "pg";

const ENCRYPTION_KEY = process.env.MIXER_ENCRYPTION_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const { Client } = pg;
const client = new Client({ connectionString: DATABASE_URL });

await client.connect();

// Get the order
const result = await client.query(
  "SELECT * FROM mixer_orders WHERE order_id = $1",
  ['MIX-1763600645985-2V72X968']
);

if (result.rows.length === 0) {
  console.log("Order not found");
  process.exit(1);
}

const order = result.rows[0];
console.log("Processing order:", order.order_id);
console.log("Recipient:", order.recipient_address);
console.log("Token:", order.token_mint);

// Update to processing
await client.query(
  "UPDATE mixer_orders SET status = $1 WHERE order_id = $2",
  ['processing', order.order_id]
);

try {
  // Decrypt private key
  const bytes = CryptoJS.AES.decrypt(order.deposit_private_key, ENCRYPTION_KEY);
  const privateKeyStr = bytes.toString(CryptoJS.enc.Utf8);
  const depositKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyStr));

  console.log("Deposit address:", depositKeypair.publicKey.toBase58());

  // Setup connection
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const tokenMintPubkey = new PublicKey(order.token_mint);
  const recipientPubkey = new PublicKey(order.recipient_address);

  // Get token accounts
  const sourceATA = await getAssociatedTokenAddress(
    tokenMintPubkey,
    depositKeypair.publicKey,
    false
  );

  const destinationATA = await getAssociatedTokenAddress(
    tokenMintPubkey,
    recipientPubkey,
    false
  );

  console.log("Source ATA:", sourceATA.toBase58());
  console.log("Destination ATA:", destinationATA.toBase58());

  // Build transaction
  const transaction = new Transaction();

  // Check if recipient ATA exists
  try {
    await getAccount(connection, destinationATA);
    console.log("Destination ATA exists");
  } catch {
    console.log("Creating destination ATA");
    transaction.add(
      createAssociatedTokenAccountInstruction(
        depositKeypair.publicKey,
        destinationATA,
        recipientPubkey,
        tokenMintPubkey
      )
    );
  }

  // Get source account balance
  const sourceAccount = await getAccount(connection, sourceATA);
  const transferAmount = sourceAccount.amount;
  console.log("Transfer amount:", transferAmount.toString());

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      sourceATA,
      destinationATA,
      depositKeypair.publicKey,
      transferAmount
    )
  );

  // Get recent blockhash and send
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = depositKeypair.publicKey;

  // Sign and send
  transaction.sign(depositKeypair);
  const signature = await connection.sendRawTransaction(transaction.serialize());
  
  console.log("Transaction sent:", signature);
  console.log("Waiting for confirmation...");

  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');

  console.log("✅ Payout completed successfully!");

  // Update order status
  await client.query(
    "UPDATE mixer_orders SET status = $1, payout_tx_signature = $2, payout_executed_at = NOW() WHERE order_id = $3",
    ['completed', signature, order.order_id]
  );

  console.log("Order updated to completed");
  console.log("Transaction signature:", signature);

} catch (error: any) {
  console.error("❌ Payout failed:", error.message);
  await client.query(
    "UPDATE mixer_orders SET status = $1 WHERE order_id = $2",
    ['deposited', order.order_id]
  );
  process.exit(1);
} finally {
  await client.end();
}
