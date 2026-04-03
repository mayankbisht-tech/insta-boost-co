import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header with buttons */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 py-6 sm:px-8 sm:py-8"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white font-bold">
            ▶
          </div>
          <span className="font-display text-xl font-bold text-foreground">GoClips</span>
        </div>

        <motion.div
          className="flex items-center gap-3 sm:gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => navigate('/auth', { state: { rolePreSelected: true } })}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              User
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => navigate('/auth/admin', { state: { rolePreSelected: true } })}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Admin
            </Button>
          </motion.div>
        </motion.div>
      </motion.header>

      {/* Main content */}
      <motion.main
        className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 sm:px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo and title section */}
        <motion.div variants={itemVariants} className="text-center space-y-6 max-w-2xl">
          <motion.div
            className="flex justify-center mb-4"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-2xl opacity-30" />
              <div className="h-24 w-24 sm:h-32 sm:w-32 relative z-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-5xl sm:text-6xl font-bold text-primary-foreground">
                ▶
              </div>
            </div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="gradient-text font-display text-4xl sm:text-5xl lg:text-6xl font-bold">
            GoClips
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Earn money from your Instagram Reels and track your progress.
          </motion.p>

          {/* CTA Section */}
          <motion.div variants={itemVariants} className="pt-6 space-y-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => navigate('/auth', { state: { rolePreSelected: true } })}
                size="lg"
                className="w-full max-w-sm bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold text-lg px-8 py-3 rounded-xl shadow-xl hover:shadow-2xl transition-all"
              >
                Get Started as Creator
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => navigate('/auth/admin', { state: { rolePreSelected: true } })}
                variant="outline"
                size="lg"
                className="w-full max-w-sm border-2 border-accent text-accent hover:bg-accent/10 font-semibold text-lg px-8 py-3 rounded-xl transition-all"
              >
                Admin Portal
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Features section */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-4xl"
        >
          {[
            {
              icon: '📱',
              title: 'Easy Submissions',
              description: 'Submit your Instagram Reels in seconds',
            },
            {
              icon: '📊',
              title: 'Track Progress',
              description: 'Monitor your earnings in real-time',
            },
            {
              icon: '💰',
              title: 'Instant Rewards',
              description: 'Get paid for your best content',
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="stat-card p-6 text-center space-y-3"
              whileHover={{ y: -5 }}
            >
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="font-bold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>
    </div>
  );
};

export default Landing;
