import { motion, AnimatePresence } from "framer-motion";
import { Shield, Shuffle, Lock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface PrivacyVisualizationProps {
  isActive: boolean;
  privacyScore?: number;
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

export function PrivacyVisualization({ isActive, privacyScore = 0 }: PrivacyVisualizationProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive) {
      setCurrentStage(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % privacyStages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    const particleInterval = setInterval(() => {
      setParticles((prev) => [...prev, Date.now()].slice(-8));
    }, 300);

    return () => clearInterval(particleInterval);
  }, [isActive]);

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
              {isActive ? Math.min(95 + privacyScore, 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
              initial={{ width: "0%" }}
              animate={{ width: isActive ? `${Math.min(95 + privacyScore, 100)}%` : "0%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Privacy Stages */}
        <div className="space-y-4">
          {privacyStages.map((stage, index) => {
            const Icon = stage.icon;
            const isActiveStage = isActive && index <= currentStage;
            const isCurrentStage = isActive && index === currentStage;

            return (
              <motion.div
                key={stage.id}
                className="relative"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: isActiveStage ? 1 : 0.3 }}
                data-testid={`stage-${stage.id}`}
              >
                <div className="flex items-center gap-4">
                  {/* Stage Icon */}
                  <div className="relative">
                    <motion.div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center`}
                      animate={
                        isCurrentStage
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
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </motion.div>

                    {/* Particle Effect */}
                    <AnimatePresence>
                      {isCurrentStage &&
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
                  {isActiveStage && (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      data-testid={`indicator-${stage.id}`}
                    />
                  )}
                </div>

                {/* Connecting Line */}
                {index < privacyStages.length - 1 && (
                  <div className="ml-6 h-8 w-0.5 bg-border relative overflow-hidden">
                    {isActiveStage && (
                      <motion.div
                        className="absolute inset-0 w-full bg-gradient-to-b from-primary to-transparent"
                        initial={{ y: "-100%" }}
                        animate={{ y: "100%" }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
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

        {/* Idle State Message */}
        {!isActive && (
          <div className="text-center py-8 text-sm text-muted-foreground" data-testid="text-idle-message">
            Enter swap details to see privacy layers in action
          </div>
        )}
      </CardContent>
    </Card>
  );
}
