import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Lock, Eye, Globe, Zap, CheckCircle2 } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Privacy Whitepaper
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            ZK NinjaSwap: Privacy-First Cross-Chain Asset Exchange
          </p>
          <p className="text-sm text-muted-foreground/70">
            Version 1.0 • Powered by ZK Enigma Link Network
          </p>
        </div>

        {/* Quick Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-cyan-500/20 bg-card/60 backdrop-blur">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-400 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Zero KYC</h3>
                <p className="text-sm text-muted-foreground">
                  No identity verification ever required
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 border-purple-500/20 bg-card/60 backdrop-blur">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-purple-400 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Anonymous</h3>
                <p className="text-sm text-muted-foreground">
                  Ephemeral sessions with no tracking
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 border-pink-500/20 bg-card/60 backdrop-blur">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-pink-400 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Cross-Chain</h3>
                <p className="text-sm text-muted-foreground">
                  1,200+ cryptocurrencies supported
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="p-8 bg-card/60 backdrop-blur">
          <ScrollArea className="h-[600px] pr-4">
            <div className="prose prose-invert max-w-none space-y-6">
              
              {/* Abstract */}
              <section data-testid="section-abstract">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-cyan-400" />
                  Abstract
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  ZK NinjaSwap is a privacy-preserving cryptocurrency exchange protocol that enables truly anonymous cross-chain asset swaps without requiring Know-Your-Customer (KYC) procedures, user registration, or persistent identity tracking. By leveraging zero-knowledge cryptographic principles and ephemeral session architecture, ZK NinjaSwap provides financial sovereignty to users who value privacy as a fundamental right.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  In an era of increasing financial surveillance, ZK NinjaSwap stands as a bulwark against the erosion of transactional privacy, offering a decentralized alternative that doesn't compromise security for convenience.
                </p>
              </section>

              {/* Mission Statement */}
              <section data-testid="section-mission">
                <h2 className="text-2xl font-bold text-foreground mb-4">Mission Statement</h2>
                <div className="border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-500/5 rounded-r">
                  <p className="text-lg italic text-foreground">
                    "Privacy is not a privilege. It's a fundamental human right."
                  </p>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  ZK NinjaSwap was built on the core belief that individuals should have the ability to transact freely without surveillance, data collection, or identity disclosure. We provide a trustless, anonymous gateway for cross-chain asset exchanges that respects user sovereignty.
                </p>
              </section>

              {/* The Problem */}
              <section data-testid="section-problem">
                <h2 className="text-2xl font-bold text-foreground mb-4">The Problem</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Traditional cryptocurrency exchanges require:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <span><strong>Identity Verification (KYC/AML):</strong> Passport uploads, facial recognition, address verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <span><strong>Persistent Accounts:</strong> Email registration, password management, account recovery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <span><strong>Data Collection:</strong> IP logging, transaction history tracking, behavioral profiling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <span><strong>Centralized Control:</strong> Funds custody, withdrawal limits, account freezing capabilities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <span><strong>Regulatory Compliance:</strong> Data sharing with governments, transaction monitoring, reporting</span>
                  </li>
                </ul>
                <p className="text-foreground font-semibold mt-4">
                  These requirements fundamentally contradict the decentralization ethos of cryptocurrency.
                </p>
              </section>

              {/* Our Solution */}
              <section data-testid="section-solution">
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Solution</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ZK NinjaSwap eliminates all identity requirements through:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Zero KYC/AML</strong> – No identity verification ever required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span><strong>No Account Creation</strong> – Ephemeral sessions only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span><strong>No Email/Password</strong> – Complete anonymity by default</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Non-Custodial</strong> – You control your assets at all times</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Cross-Chain Support</strong> – 1,200+ cryptocurrencies across all major blockchains</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span><strong>ZK Privacy Tunnel</strong> – Visual cryptographic proof of privacy-preserving execution</span>
                  </li>
                </ul>
              </section>

              {/* Privacy Guarantees */}
              <section data-testid="section-privacy">
                <h2 className="text-2xl font-bold text-foreground mb-4">Privacy Guarantees</h2>
                
                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">1. Unlinkability</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Each exchange is cryptographically isolated. Even if an adversary observes multiple exchanges, they <strong>cannot prove</strong> they originated from the same user. Session unlinkability ensures anonymous users leave zero persistent identifiers.
                </p>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2. Forward Secrecy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Expired unfunded orders are automatically deleted. Completed transactions auto-close after 10 minutes. Historical data cannot be retroactively linked. Browser sessions are isolated with no localStorage or cookie persistence.
                </p>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">3. Metadata Protection</h3>
                <p className="text-muted-foreground leading-relaxed">
                  No IP logging, no CDN-based geolocation, no timing correlation attacks. All exchanges have standardized expiration windows to prevent timing-based deanonymization.
                </p>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">4. Censorship Resistance</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Permissionless access with no account approval, no region blocking, no transaction limits, and no "suspicious activity" freezes. Cross-chain exchanges route through decentralized protocols.
                </p>
              </section>

              {/* Security Model */}
              <section data-testid="section-security">
                <h2 className="text-2xl font-bold text-foreground mb-4">Security Model</h2>
                
                <h3 className="text-xl font-semibold text-foreground mb-3">What We Protect Against</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">•</span>
                    <span><strong>Blockchain Analytics Firms</strong> – Cannot link swap transactions across chains or build transaction graphs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">•</span>
                    <span><strong>Government Surveillance</strong> – No KYC data to subpoena, no logs connecting users to transactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">•</span>
                    <span><strong>Network Adversaries</strong> – No IP logging, encrypted connections, no tracking cookies</span>
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Non-Custodial Architecture</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We never have custody of your funds at any point. Before swap: assets remain in your wallet. During swap: assets sent to decentralized exchange protocols. After swap: assets delivered directly to your specified address.
                </p>
              </section>

              {/* Use Cases */}
              <section data-testid="section-use-cases">
                <h2 className="text-2xl font-bold text-foreground mb-4">Use Cases</h2>
                
                <div className="space-y-4">
                  <div className="border-l-2 border-cyan-500/50 pl-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Privacy-Conscious Investors</h3>
                    <p className="text-muted-foreground text-sm">
                      Protect portfolio composition from public visibility. Swap between assets without identity linkage or aggregated portfolio tracking.
                    </p>
                  </div>

                  <div className="border-l-2 border-purple-500/50 pl-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Cross-Border Remittances</h3>
                    <p className="text-muted-foreground text-sm">
                      Send money to family in countries with capital controls. Instant transfers with minimal fees, no identification requirements.
                    </p>
                  </div>

                  <div className="border-l-2 border-pink-500/50 pl-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Censorship Resistance</h3>
                    <p className="text-muted-foreground text-sm">
                      Support organizations without fear of retaliation. Permissionless transactions that cannot be blocked or frozen.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-500/50 pl-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Commercial Privacy</h3>
                    <p className="text-muted-foreground text-sm">
                      Protect business supplier relationships and pricing strategies from competitors through unlinkable payment transactions.
                    </p>
                  </div>

                  <div className="border-l-2 border-purple-500/50 pl-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Personal Safety</h3>
                    <p className="text-muted-foreground text-sm">
                      High-net-worth individuals can avoid targeted attacks by maintaining financial privacy and reducing attack surface.
                    </p>
                  </div>
                </div>
              </section>

              {/* Future Roadmap */}
              <section data-testid="section-roadmap">
                <h2 className="text-2xl font-bold text-foreground mb-4">Future Roadmap</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-2">Phase 1: Privacy Enhancements (Q2 2025)</h3>
                    <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                      <li>• Full ZK-SNARK integration with production proof circuits</li>
                      <li>• Native Tor hidden service (.onion address)</li>
                      <li>• Multi-hop swaps through privacy coins</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Phase 2: Decentralization (Q3 2025)</h3>
                    <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                      <li>• Decentralized exchange network with P2P liquidity</li>
                      <li>• IPFS frontend hosting for censorship resistance</li>
                      <li>• DAO governance for protocol upgrades</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-pink-400 mb-2">Phase 3: Advanced Features (Q4 2025)</h3>
                    <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                      <li>• Lightning Network integration for instant BTC swaps</li>
                      <li>• Private stablecoin support</li>
                      <li>• Native mobile applications (iOS & Android)</li>
                      <li>• Smart contract privacy integrations</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Conclusion */}
              <section data-testid="section-conclusion">
                <h2 className="text-2xl font-bold text-foreground mb-4">Conclusion</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ZK NinjaSwap represents a paradigm shift in cryptocurrency exchange philosophy. Where others have embraced surveillance capitalism and regulatory compliance, we've chosen a different path: <strong className="text-foreground">radical financial privacy as a default, not an option.</strong>
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  In a world where financial transactions are increasingly monitored, tracked, and weaponized, ZK NinjaSwap stands as a testament to the original vision of cryptocurrency—permissionless, censorship-resistant, and private value transfer.
                </p>
                <div className="border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-500/5 rounded-r mt-6">
                  <p className="text-foreground font-semibold">
                    Privacy is not about having something to hide. It's about having something to protect.
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Your financial freedom. Your personal safety. Your right to transact without permission.
                  </p>
                </div>
                <p className="text-foreground font-bold text-lg mt-6 text-center">
                  Welcome to ZK NinjaSwap. Swap freely. Stay invisible.
                </p>
              </section>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground/70">
                  Powered by ZK Enigma Link Network • Version 1.0 • November 2025
                </p>
                <p className="text-xs text-muted-foreground/50 mt-2">
                  For the complete technical whitepaper, see WHITEPAPER.md in the project repository
                </p>
              </div>

            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
