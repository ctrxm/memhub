import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Flame, TrendingUp, Users, Upload, Bell, Shield,
  ChevronRight, Star, Zap, ImageIcon, MessageSquare, Trophy
} from "lucide-react";
import { OvrHubLogoIcon } from "@/components/ui/OvrHubLogo";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const features = [
  {
    icon: <Flame className="w-6 h-6" />,
    title: "Hot & Trending Feed",
    desc: "Discover the funniest memes sorted by Hot, Trending, Fresh, and Top. Never miss a viral moment.",
  },
  {
    icon: <Upload className="w-6 h-6" />,
    title: "Upload & Share",
    desc: "Post your best memes, GIFs, and images. Get upvoted by the community and rise to the top.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Communities",
    desc: "Join niche communities around your favorite topics. Create your own and build a following.",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Threaded Comments",
    desc: "Deep-dive into discussions with threaded comments. React, reply, and vote on the best takes.",
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    title: "Badges & Reputation",
    desc: "Earn badges for your contributions. Show off your status on every post and profile.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Crypto Tips",
    desc: "Send and receive crypto tips on posts. Support your favorite creators with BTC, ETH, USDT, and more.",
  },
];

const stats = [
  { value: "10K+", label: "Memes Uploaded" },
  { value: "500+", label: "Communities" },
  { value: "50K+", label: "Votes Cast" },
  { value: "100%", label: "Free to Join" },
];

const mockPosts = [
  { title: "When the code finally compiles", tag: "Programming", votes: 4821 },
  { title: "Me explaining my project at 3am", tag: "Relatable", votes: 3204 },
  { title: "That one friend who doesn't get the meme", tag: "Funny", votes: 2987 },
  { title: "Backend vs Frontend developers be like", tag: "Tech", votes: 2541 },
  { title: "Monday morning energy", tag: "Life", votes: 1998 },
  { title: "My cat judging my life choices", tag: "Cats", votes: 1765 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Navbar */}
      <header className="sticky top-0 z-40 glass-panel">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OvrHubLogoIcon size={32} className="rounded-lg" />
            <span className="font-display text-2xl font-bold tracking-tight">
              OVR<span className="text-primary">HUB</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
                Join Free
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <motion.div
          className="relative z-10 max-w-3xl"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-medium mb-6">
              <Star className="w-3.5 h-3.5" /> The Internet's Funniest Corner
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="font-meme text-6xl sm:text-8xl tracking-wide leading-none mb-6"
          >
            WHERE MEMES<br />
            <span className="text-primary">COME ALIVE</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10"
          >
            Upload, discover, and share the funniest memes on the internet.
            Join communities, earn badges, and become a meme legend.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25 text-base">
                Start for Free <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/login">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-secondary text-secondary-foreground font-semibold rounded-2xl hover:bg-secondary/80 transition-all text-base">
                <ImageIcon className="w-4 h-4" /> Browse Memes
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-4 pb-20">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-card border border-border/50 rounded-2xl p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="font-display text-3xl font-bold text-primary mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Meme Preview Grid */}
      <section className="px-4 pb-24">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-3">
              What's <span className="text-primary">Trending</span> Now
            </h2>
            <p className="text-muted-foreground">Fresh memes, voted by the community</p>
          </motion.div>

          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockPosts.map((post, i) => (
                <motion.div
                  key={i}
                  className="bg-card border border-border/50 rounded-2xl overflow-hidden card-hover group cursor-pointer"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="h-40 bg-secondary/60 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                    <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                    <span className="absolute top-3 left-3 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary border border-primary/20 font-medium">
                      {post.tag}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Flame className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-primary">{post.votes.toLocaleString()}</span>
                      <span>upvotes</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Blur overlay CTA */}
            <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-background via-background/90 to-transparent flex flex-col items-center justify-end pb-4">
              <p className="text-muted-foreground text-sm mb-4">Join to see thousands more memes</p>
              <Link href="/register">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm">
                  Join Free & Explore <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-24 bg-card/30 border-y border-border/50">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-3">
              Everything You <span className="text-primary">Need</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              A full-featured meme platform built for the community, by the community.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="bg-card border border-border/50 rounded-2xl p-6 card-hover"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 py-24">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            className="relative rounded-3xl overflow-hidden border border-primary/20 bg-card p-10 sm:p-16 text-center"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <h2 className="font-meme text-5xl sm:text-6xl tracking-wide mb-4">
                READY TO <span className="text-primary">LAUGH?</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                Free forever. No credit card. Just memes, friends, and good vibes.
              </p>
              <Link href="/register">
                <button className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 transition-all hover:scale-105 shadow-xl shadow-primary/30 text-lg">
                  Create Free Account <ChevronRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <OvrHubLogoIcon size={24} className="rounded-md" />
            <span className="font-display font-bold text-lg">OVR<span className="text-primary">HUB</span></span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 OVRHUB. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
