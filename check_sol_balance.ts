import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const depositAddress = new PublicKey("FdZJ9BwkUJP5vzyGH72jxTbnV4AngcNgn7NrwDHFFbTF");

const balance = await connection.getBalance(depositAddress);
console.log("Deposit address SOL balance:", balance / 1e9, "SOL");
console.log("Balance in lamports:", balance);

if (balance === 0) {
  console.log("\n❌ ISSUE: No SOL in deposit address to pay for transaction fees");
  console.log("Need: ~0.002044 SOL (for fees + ATA creation)");
  console.log("\nSOLUTIONS:");
  console.log("1. Send ~0.005 SOL to the deposit address first");
  console.log("2. Or redesign to have backend wallet pay fees from a master wallet");
}
