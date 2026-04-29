import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isSuperadmin } = useAuth();

  if (user) {
    const destination = isSuperadmin ? '/superadmin' : isAdmin ? '/admin' : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: 'easeOut' },
    },
  };

  const floatVariants = {
    animate: {
      y: [0, -14, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(214_100%_97%)_45%,hsl(210_100%_99%)_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-cyan-200/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,255,255,0.2))]" />
      </div>

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left" type="button">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-[0_10px_30px_rgba(59,130,246,0.14)] ring-1 ring-border/70 backdrop-blur">
            <span className="text-xl font-bold"><img src="/3.png" alt="GoClips Logo" className="h-full w-full object-contain" /></span>
          </div>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">GoClips</p>
            <p className="text-xs text-muted-foreground">Creator rewards, made clean</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/auth')} className="hidden text-muted-foreground sm:inline-flex">
            Log in
          </Button>
          <Button onClick={() => navigate('/auth')} className="rounded-full px-5 shadow-lg shadow-primary/15">
            Get started
          </Button>
        </div>
      </motion.header>

      <motion.main
        className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col justify-center px-4 pb-10 pt-2 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.section variants={itemVariants} className="max-w-2xl">

            <motion.h1
              variants={itemVariants}
              className="font-display text-5xl font-bold leading-[0.95] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
            >
              Grow faster with a cleaner creator payout flow.
            </motion.h1>

            <motion.p variants={itemVariants} className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              A bright, focused landing page that puts the campaign artwork front and center while guiding creators straight into submissions, payouts, and tracking.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => navigate('/auth')}
                  size="lg"
                  className="h-12 rounded-full bg-slate-950 px-7 text-base font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)] hover:bg-slate-800"
                >
                  Start now
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => navigate('/auth')}
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-slate-300 bg-white/70 px-7 text-base font-semibold text-slate-700 backdrop-blur hover:bg-white"
                >
                  View portal
                </Button>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { value: 'Fast', label: 'Submission flow' },
                { value: 'Clear', label: 'Payout visibility' },
                { value: 'Light', label: 'Modern experience' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur"
                >
                  <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section variants={itemVariants} className="relative flex items-center justify-center lg:justify-end">
            <motion.div variants={floatVariants} animate="animate" className="relative w-full max-w-[560px]">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-200/60 via-white/60 to-cyan-100/40 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.12),transparent_28%)]" />

                <div className="relative flex items-center justify-between gap-3 px-1 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Featured campaign</p>
                  </div>
                </div>

                <div className="relative mx-auto overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-inner">
                  <img
                    src="/3.png"
                    alt="GoClips landing artwork"
                    className="h-[420px] w-full object-cover object-center sm:h-[520px]"
                    loading="eager"
                  />

                  <div className="absolute bottom-4 left-4 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-lg backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Campaign earnings</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">Clean and visible</p>
                  </div>
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-2xl border border-sky-200/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur"
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-sky-500">Revenue</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">₹0.00</p>
                    <p className="text-sm text-slate-500">until approved</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.section>
        </div>

        <motion.section variants={itemVariants} className="mt-14 grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Submission-ready',
              description: 'Creators can move from login to campaign tracking without visual clutter.',
            },
            {
              title: 'Payout clarity',
              description: 'The UI emphasizes payout visibility so limits and approvals stay obvious.',
            },
            {
              title: 'Smooth motion',
              description: 'Gentle floating, staggered reveals, and soft gradients keep the page feeling alive.',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">0{index + 1}</p>
              <h3 className="mt-3 font-display text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </motion.div>
          ))}
        </motion.section>
      </motion.main>
    </div>
  );
};

export default Landing;
