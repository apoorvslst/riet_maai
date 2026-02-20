import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link as ScrollLink, Element } from 'react-scroll';
import {
  Mic,
  Heart,
  Baby,
  BookOpen,
  Users,
  ArrowRight,
  Play,
  ShieldCheck,
  Activity,
  MessageCircle,
  Stethoscope,

  LogOut,
  User as UserIcon
} from 'lucide-react';
import Auth from './Auth';


// Hero Image Path from the user link
const HERO_IMAGE = 'https://clipart-library.com/2024/pregnant-woman-cartoon/pregnant-woman-cartoon-1.jpg';

const Navbar = ({ onAuthClick, user, onLogout, onContactClick, contactLoading }) => {
  return (
    <nav className="glass-nav">
      <div className="container py-4 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Heart color="var(--secondary)" size={24} fill="var(--secondary)" />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'Outfit' }}>Janani</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {['Home', 'Demo', 'Mission'].map((item) => (
            <ScrollLink
              key={item}
              to={item.toLowerCase()}
              smooth={true}
              duration={500}
              offset={-70}
              style={{ cursor: 'pointer', fontWeight: '500', color: 'var(--text-dark)', transition: 'color 0.3s' }}
              className="hover-text-primary"
            >
              {item}
            </ScrollLink>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onContactClick}
            disabled={contactLoading}
            className="btn-primary"
            style={{
              padding: '0.5rem 1.5rem',
              background: 'transparent',
              border: '2px solid var(--primary)',
              color: 'var(--primary)',
              opacity: contactLoading ? 0.7 : 1
            }}
          >
            {contactLoading ? 'Calling...' : 'Contact Support'}
          </button>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '600' }}>
                <UserIcon size={20} />
                <span>{user.name}</span>
              </div>
              <button onClick={onLogout} className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <button onClick={onAuthClick} className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>Get Started / Login</button>
          )}
        </div>
      </div>
    </nav>
  );
};


const Hero = ({ onAuthClick, user }) => {
  return (
    <Element name="home">
      <section className="container" style={{ paddingTop: '150px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4rem',
          flexDirection: 'row',
          flexWrap: 'wrap'
        }}>
          {/* Left Content */}
          <Motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            style={{ flex: '1', minWidth: '300px', textAlign: 'left' }}
          >
            <Motion.h1
              className="gradient-text"
              style={{ fontSize: '5.5rem', lineHeight: '1.1', marginBottom: '1.5rem', fontWeight: '800' }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              Janani
            </Motion.h1>
            <h2 style={{ fontSize: '2.2rem', color: 'var(--text-dark)', marginBottom: '2rem', fontWeight: '600', lineHeight: '1.3' }}>
              AI-Powered Multilingual Voice Assistant for <span style={{ color: 'var(--primary)' }}>Rural Maternal Care</span>
            </h2>

            <p style={{ fontSize: '1.25rem', color: 'var(--text-light)', marginBottom: '3rem', maxWidth: '550px' }}>
              Empowering Rural Women with RAG-Based Medical Intelligence.
              Providing life-saving prenatal care insights through simple, natural voice conversations.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {!user && (
                <button
                  onClick={onAuthClick}
                  className="btn-primary"
                  style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  Get Started <ArrowRight size={20} />
                </button>
              )}
              {user && (
                <button
                  className="btn-primary"
                  style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  Go to Dashboard <ArrowRight size={20} />
                </button>
              )}
              <button style={{
                background: 'transparent',
                border: '2px solid var(--primary)',
                color: 'var(--primary)',
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Learn More
              </button>
            </div>
          </Motion.div>


          {/* Right Image */}
          <Motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            style={{ flex: '1', minWidth: '300px', display: 'flex', justifyContent: 'center', position: 'relative' }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '85%',
              height: '85%',
              background: 'var(--accent)',
              borderRadius: '50%',
              filter: 'blur(60px)',
              zIndex: -1,
              opacity: 0.5
            }}></div>
            <img
              src={HERO_IMAGE}
              alt="Maternal Health"
              style={{
                width: '100%',
                maxWidth: '550px',
                height: 'auto',
                borderRadius: '40px',
                boxShadow: 'var(--shadow-lg)',
                border: '8px solid white'
              }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1559832306-27a0278d99a7?auto=format&fit=crop&q=80&w=1000';
              }}
            />
          </Motion.div>
        </div>
      </section>
    </Element>
  );
};

const DemoSection = () => {
  return (
    <Element name="demo">
      <section style={{ background: '#fff' }}>
        <div className="container text-center" style={{ textAlign: 'center' }}>
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Seeing is Believing</h2>
            <p style={{ maxWidth: '700px', margin: '0 auto 4rem', color: 'var(--text-light)' }}>
              Watch how MatriCare AI transforms the complex prenatal tracking process into a simple, natural conversation.
            </p>

            <div style={{
              width: '100%',
              maxWidth: '900px',
              margin: '0 auto',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '30px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              {/* Mock Video Player */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(45deg, rgba(0,0,0,0.7), rgba(0,0,0,0.3))'
              }}>
                <Motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    cursor: 'pointer',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                  }}
                >
                  <Play fill="black" size={32} style={{ marginLeft: '5px' }} />
                </Motion.div>
                <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: '500' }}>Demo Video: Voice-Based Tracking</div>
              </div>
              <img
                src="https://images.unsplash.com/photo-1584362946444-1e7c4f440e91?auto=format&fit=crop&q=80&w=1000"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                alt="Demo Preview"
              />
            </div>
          </Motion.div>
        </div>
      </section>
    </Element>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <Motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.6 }}
    className="hover-lift"
    style={{
      background: 'white',
      padding: '2.5rem',
      borderRadius: '24px',
      textAlign: 'left',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid #f0f0f0'
    }}
  >
    <div style={{
      background: '#f1f8e9',
      width: '60px',
      height: '60px',
      borderRadius: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '1.5rem'
    }}>
      <Icon color="var(--primary)" size={32} />
    </div>
    <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>{title}</h3>
    <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>{desc}</p>
  </Motion.div>
);

const MainContent = () => {
  return (
    <Element name="mission">
      <section style={{ background: 'transparent' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>The Knowledge Foundation</h2>
            <p style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--text-light)' }}>
              We use Retreival Augmented Generation (RAG) to process vast amounts of medical expertise,
              ensuring every mother gets scientifically accurate, simplified advice.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem'
          }}>
            <FeatureCard
              icon={BookOpen}
              title="Expert Knowledge Base"
              desc="Fed with data from MBBS, MS, MD textbooks and pregnancy research papers for high reliability."
              delay={0.1}
            />
            <FeatureCard
              icon={Stethoscope}
              title="Risk Analysis"
              desc="Scraping specialist articles to detect high-risk symptoms and unavoidable physical circumstances."
              delay={0.2}
            />
            <FeatureCard
              icon={Activity}
              title="Daily Vital Tracking"
              desc="Voice-logged records of fetal movement, symptoms, and nutrition for holistic health monitoring."
              delay={0.3}
            />
            <FeatureCard
              icon={MessageCircle}
              title="Bhavini & Google TTS"
              desc="Leveraging Indian-language APIs for local accessibility in Hindi, Marathi, and Tamil."
              delay={0.4}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Secure RAG Pipeline"
              desc="Real-time fetching and synthesis of medical data tailored to individual patient history."
              delay={0.5}
            />
            <FeatureCard
              icon={Users}
              title="Low-Literate Friendly"
              desc="Eliminating manual text input; pure voice-powered interaction for rural accessibility."
              delay={0.6}
            />
          </div>
        </div>
      </section>
    </Element>
  );
};

const Footer = () => (
  <footer style={{ background: 'var(--primary)', color: 'white', padding: '4rem 0' }}>
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Heart color="white" size={24} fill="white" />
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Janani</span>
          </div>
          <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
            Empowering Rural Women with RAG-Based Medical Intelligence
          </p>
        </div>
        <div>
          <h4 style={{ color: 'white', marginBottom: '1.5rem' }}>Quick Links</h4>
          <ul style={{ listStyle: 'none', opacity: 0.8 }}>
            <li style={{ marginBottom: '0.8rem' }}>About System</li>
            <li style={{ marginBottom: '0.8rem' }}>Research Base</li>
            <li style={{ marginBottom: '0.8rem' }}>Terms of Care</li>
          </ul>
        </div>
        <div>
          <h4 style={{ color: 'white', marginBottom: '1.5rem' }}>Tech Stack</h4>
          <ul style={{ listStyle: 'none', opacity: 0.8 }}>
            <li style={{ marginBottom: '0.8rem' }}>Bhavini AI API</li>
            <li style={{ marginBottom: '0.8rem' }}>Google TTS</li>
            <li style={{ marginBottom: '0.8rem' }}>Hugging Face Models</li>
          </ul>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
        © 2026 MatriCare AI. Hackathon Finalist Entry.
      </div>
    </div>
  </footer>
);

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleContact = async () => {
    setContactLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/voice/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to trigger call');
      alert('Call initiated! You will receive a call shortly.');
    } catch (err) {
      console.error('Error triggering call:', err);
      alert('Could not initiate call. Please check if the backend is running and ngrok is configured.');
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    // Initial user state is now handled by useState initializer
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="App">
      <Navbar
        onAuthClick={() => setShowAuth(true)}
        user={user}
        onLogout={handleLogout}
        onContactClick={handleContact}
        contactLoading={contactLoading}
      />
      <Hero onAuthClick={() => setShowAuth(true)} user={user} />
      <DemoSection />
      <MainContent />
      <Footer />

      <AnimatePresence>
        {showAuth && (
          <Auth
            onClose={() => setShowAuth(false)}
            onAuthSuccess={(userData) => setUser(userData)}
          />
        )}
      </AnimatePresence>

      {/* Embedded Animations Styles */}
      <style>{`
        .hover-text-primary:hover {
          color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}


export default App;
