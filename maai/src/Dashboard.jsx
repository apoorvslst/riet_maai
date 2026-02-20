import React from 'react';
import { motion as Motion } from 'framer-motion';
import {
    Baby,
    Bot,
    Activity,
    Calendar,
    Award,
    AlertTriangle,
    ChevronRight,
    Volume2
} from 'lucide-react';

const Dashboard = ({ user, onBack, onEmergencyCall }) => {

    const handleListenTip = () => {
        const tip = "Since you reported mild fatigue yesterday, make sure to include iron-rich snacks like jaggery and roasted chana in your afternoon meal today.";
        const utterance = new SpeechSynthesisUtterance(tip);
        utterance.lang = 'en-IN'; // Indian English accent
        window.speechSynthesis.speak(utterance);
    };

    return (
        <Motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            style={{ padding: '100px 0', minHeight: '100vh', background: '#f8fafc' }}
        >
            <div className="container">
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', color: 'var(--text-dark)' }}>Namaste, {user?.name || 'Mataji'}!</h1>
                        <p style={{ color: 'var(--text-light)', fontSize: '1.2rem' }}>Here is your pregnancy health summary for today.</p>
                    </div>
                    <button
                        onClick={onBack}
                        className="btn-primary"
                        style={{
                            background: 'transparent',
                            border: '2px solid var(--primary)',
                            color: 'var(--primary)',
                            padding: '0.8rem 1.5rem'
                        }}
                    >
                        Back to Home
                    </button>
                </div>

                {/* Dashboard Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                    {/* Pregnancy Progress Card */}
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '30px', boxShadow: 'var(--shadow-md)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ background: '#fce4ec', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Baby color="var(--primary)" size={30} />
                            </div>
                            <span style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--primary)' }}>Week 24</span>
                        </div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Growth Tracker</h3>
                        <div style={{ height: '12px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                            <Motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '60%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                            />
                        </div>
                        <p style={{ color: 'var(--text-light)' }}>
                            Your baby is now the size of a <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Corn Ear</span>.
                            Only 16 weeks to go!
                        </p>
                    </div>

                    {/* AI Insights Card */}
                    <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #b01854 100%)', padding: '2.5rem', borderRadius: '30px', color: 'white', boxShadow: '0 20px 40px rgba(176, 24, 84, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.8rem', borderRadius: '50%' }}>
                                <Bot color="white" size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.3rem' }}>Janani AI Recommendation</h3>
                        </div>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem', opacity: 0.9 }}>
                            "Since you reported mild fatigue yesterday, make sure to include iron-rich snacks like jaggery and roasted chana in your afternoon meal today."
                        </p>
                        <button
                            onClick={handleListenTip}
                            style={{ background: 'white', color: 'var(--primary)', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '50px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Listen to Voice Tip <Volume2 size={18} />
                        </button>
                    </div>

                    {/* Health Vitals Summary */}
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '30px', boxShadow: 'var(--shadow-md)', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Activity color="var(--primary)" size={24} /> Today's Vitals
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '20px' }}>
                                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Fetal Kicks</p>
                                <h4 style={{ fontSize: '2rem', color: 'var(--primary)' }}>12 <span style={{ fontSize: '1rem', color: '#64748b' }}>/day</span></h4>
                            </div>
                            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '20px' }}>
                                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Sleep Status</p>
                                <h4 style={{ fontSize: '1.2rem', color: '#10b981' }}>Good (8h)</h4>
                            </div>
                        </div>
                    </div>

                    {/* Task Tracker */}
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '30px', boxShadow: 'var(--shadow-md)', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Calendar color="var(--primary)" size={24} /> Next Visit
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', background: '#fff9fa', borderRadius: '20px', border: '1px dashed var(--primary)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>FEB</p>
                                <h2 style={{ fontSize: '1.8rem' }}>25</h2>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '1.1rem' }}>Routine Check-up</h4>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>At District Hospital, 10:00 AM</p>
                            </div>
                            <ChevronRight color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                        </div>
                    </div>

                    {/* Achievements */}
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '30px', boxShadow: 'var(--shadow-md)', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Award color="#eab308" size={24} /> Achievements
                        </h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ width: '60px', height: '60px', background: '#fefce8', borderRadius: '50%', border: '2px solid #fef08a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <Award color="#eab308" size={24} />
                                </div>
                            ))}
                            <div style={{ width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>+</span>
                            </div>
                        </div>
                        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>7-day logging streak! Keep it up for a special reward.</p>
                    </div>

                    {/* SOS Emergency */}
                    <div style={{ background: '#fef2f2', padding: '2.5rem', borderRadius: '30px', border: '2px solid #fee2e2', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', background: '#ef4444', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}>
                            <AlertTriangle color="white" size={30} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', color: '#b91c1c', marginBottom: '0.5rem' }}>Need Help Now?</h3>
                        <p style={{ color: '#991b1b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Single tap to call the nearest health worker (ASHA).</p>
                        <button
                            onClick={onEmergencyCall}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '1rem', borderRadius: '50px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                            Emergency Call
                        </button>
                    </div>

                </div>
            </div>
        </Motion.div>
    );
};

export default Dashboard;
