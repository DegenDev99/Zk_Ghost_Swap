import { motion, AnimatePresence } from "framer-motion";
import { Shield, Shuffle, Lock, Zap, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";

interface PrivacyVisualizationProps {
  isActive: boolean;
  privacyScore?: number;
  exchangeId?: string;
  exchangeStatus?: string;
}

const privacyStages = [
  {
    id: "shield",
    icon: Shield,
    title: "Identity Shield",
    description: "Wallet addresses obfuscated",
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "mixer",
    icon: Shuffle,
    title: "Mixing Relay",
    description: "Transaction amounts obscured",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "zk-proof",
    icon: Lock,
    title: "ZK Proof Forge",
    description: "Zero-knowledge verification",
    color: "from-pink-500 to-red-500",
  },
  {
    id: "quantum",
    icon: Zap,
    title: "Quantum Scrambler",
    description: "Network routing anonymized",
    color: "from-cyan-500 to-purple-500",
  },
];

function getAnimationState(status?: string, lastKnownState?: { score: number; activeStages: number }) {
  if (!status) {
    return { score: 0, activeStages: 0, animating: false, isComplete: false };
  }

  switch (status) {
    case 'waiting':
    case 'expired':
    case 'failed':
    case 'refunded':
      return { score: 20, activeStages: 0, animating: false, isComplete: false };
    
    case 'confirming':
      return { score: 40, activeStages: 1, animating: true, isComplete: false };
    
    case 'exchanging':
      return { score: 60, activeStages: 2, animating: true, isComplete: false };
    
    case 'sending':
      return { score: 80, activeStages: 3, animating: true, isComplete: false };
    
    case 'finished':
      return { score: 100, activeStages: 4, animating: false, isComplete: true };
    
    default:
      if (lastKnownState) {
        return { ...lastKnownState, animating: false, isComplete: false };
      }
      return { score: 20, activeStages: 0, animating: false, isComplete: false };
  }
}

export function PrivacyVisualization({ isActive, privacyScore = 0, exchangeId, exchangeStatus }: PrivacyVisualizationProps) {
  const [particles, setParticles] = useState<number[]>([]);
  const [lastKnownState, setLastKnownState] = useState<{ score: number; activeStages: number } | undefined>();
  const [scrambledHash, setScrambledHash] = useState<string>('');
  
  const rawAnimState = useMemo(() => getAnimationState(exchangeStatus, lastKnownState), [exchangeStatus, lastKnownState]);
  
  useEffect(() => {
    if (rawAnimState.score > 0) {
      setLastKnownState({ score: rawAnimState.score, activeStages: rawAnimState.activeStages });
    }
  }, [rawAnimState.score, rawAnimState.activeStages]);
  
  const animState = isActive ? rawAnimState : { score: 0, activeStages: 0, animating: false, isComplete: false };
  const currentAnimatingStage = animState.animating ? animState.activeStages - 1 : -1;

  useEffect(() => {
    if (exchangeStatus === 'finished' || !exchangeId) {
      return;
    }

    const scrambleInterval = setInterval(() => {
      const chars = '0123456789abcdef';
      const scrambled = Array.from({ length: 32 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      setScrambledHash(scrambled);
    }, 100);

    return () => clearInterval(scrambleInterval);
  }, [exchangeStatus, exchangeId]);

  useEffect(() => {
    if (!animState.animating) {
      setParticles([]);
      return;
    }

    const particleInterval = setInterval(() => {
      setParticles((prev) => [...prev, Date.now()].slice(-8));
    }, 300);

    return () => clearInterval(particleInterval);
  }, [animState.animating]);

  return (
    <Card className="h-full" data-testid="card-privacy-visualization">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          ZK Privacy Tunnel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your transaction flows through multiple privacy layers
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Privacy Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Privacy Score</span>
            <span className="text-primary font-mono font-semibold" data-testid="text-privacy-score">
              {animState.score}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
              animate={{ width: `${animState.score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Privacy Stages */}
        <div className="space-y-4">
          {privacyStages.map((stage, index) => {
            const Icon = stage.icon;
            const isLitUp = index < animState.activeStages;
            const isCurrentlyAnimating = index === currentAnimatingStage;

            return (
              <motion.div
                key={stage.id}
                className="relative"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: isLitUp ? 1 : 0.3 }}
                data-testid={`stage-${stage.id}`}
              >
                <div className="flex items-center gap-4">
                  {/* Stage Icon */}
                  <div className="relative">
                    <motion.div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center`}
                      animate={
                        isCurrentlyAnimating
                          ? {
                              scale: [1, 1.1, 1],
                              boxShadow: [
                                "0 0 0 0 rgba(99, 102, 241, 0)",
                                "0 0 0 8px rgba(99, 102, 241, 0.3)",
                                "0 0 0 0 rgba(99, 102, 241, 0)",
                              ],
                            }
                          : {}
                      }
                      transition={isCurrentlyAnimating ? { duration: 2, repeat: Infinity } : {}}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </motion.div>

                    {/* Particle Effect */}
                    <AnimatePresence>
                      {isCurrentlyAnimating &&
                        particles.slice(-3).map((id) => (
                          <motion.div
                            key={id}
                            className="absolute w-2 h-2 bg-primary rounded-full"
                            initial={{ x: 20, y: 20, opacity: 1, scale: 1 }}
                            animate={{
                              x: [20, 60],
                              y: [20, -20],
                              opacity: [1, 0],
                              scale: [1, 0.5],
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                          />
                        ))}
                    </AnimatePresence>
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{stage.title}</h4>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  </div>

                  {/* Status Indicator */}
                  {isLitUp && (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={isCurrentlyAnimating ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                      transition={isCurrentlyAnimating ? { duration: 1.5, repeat: Infinity } : {}}
                      data-testid={`indicator-${stage.id}`}
                    />
                  )}
                </div>

                {/* Connecting Line */}
                {index < privacyStages.length - 1 && (
                  <div className="ml-6 h-8 w-0.5 bg-border relative overflow-hidden">
                    {isLitUp && (
                      <motion.div
                        className="absolute inset-0 w-full bg-gradient-to-b from-primary to-transparent"
                        initial={{ y: "-100%" }}
                        animate={isCurrentlyAnimating ? { y: "100%" } : { y: "0%" }}
                        transition={isCurrentlyAnimating ? { duration: 1.5, repeat: Infinity, ease: "linear" } : {}}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Privacy Features List */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-semibold">Active Privacy Features:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span className="text-muted-foreground">No KYC Required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span className="text-muted-foreground">Address Mixing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
              <span className="text-muted-foreground">ZK Proofs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span className="text-muted-foreground">Tor Compatible</span>
            </div>
          </div>
        </div>

        {/* Idle State Message - Only show when not active and no exchange status */}
        {!isActive && !exchangeStatus && (
          <div className="text-center py-8 text-sm text-muted-foreground" data-testid="text-idle-message">
            Enter swap details to see privacy layers in action
          </div>
        )}

        {/* ZK Hash and Privacy Guaranteed - Only shown when exchangeId is provided */}
        {exchangeId && (
          <>
            <div className="pt-4 border-t mt-6">
              <div className="text-center mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {exchangeStatus === 'finished' ? 'ZK Proof Hash' : 'Generating Proof Hash'}
                </p>
              </div>
              <div className={`p-3 rounded-md border ${
                exchangeStatus === 'finished' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-black/40 border-primary/20'
              }`} data-testid="box-proof-hash">
                {exchangeStatus === 'finished' ? (
                  <p className="font-mono text-xs break-all text-center text-green-400" data-testid="text-proof-hash">
                    zk_0x{exchangeId.replace(/-/g, '').slice(0, 32).padEnd(32, '0')}
                  </p>
                ) : (
                  <p className="font-mono text-xs break-all text-center text-primary/40 blur-[2px] select-none" data-testid="text-proof-hash-scrambled">
                    zk_0x{scrambledHash}
                  </p>
                )}
              </div>
              {exchangeStatus !== 'finished' && (
                <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-primary mb-1">PROOF GENERATION IN PROGRESS</p>
                      <p className="text-muted-foreground">
                        Hash will be revealed when transaction is 100% complete.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {exchangeStatus === 'finished' && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-green-500 mb-1">PROOF FINALIZED</p>
                      <p className="text-muted-foreground">
                        <strong>Important:</strong> Save this ZK proof hash for your records. This cryptographic proof verifies your transaction's privacy guarantees.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-2 border-primary/30 rounded-md text-center">
                <p className="text-sm font-bold text-foreground mb-1">
                  PRIVACY GUARANTEED
                </p>
                <p className="text-xs text-muted-foreground">
                  Your swap is protected by military-grade zero-knowledge cryptography.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
