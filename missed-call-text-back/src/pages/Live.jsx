import { motion } from 'motion/react';
import { PhoneIncoming, ChatText, Brain, CalendarCheck, EnvelopeSimple, CaretRight } from '@phosphor-icons/react';
import { LiveStage } from '../components/LiveStage.jsx';

const FLOW = [
  { icon: PhoneIncoming, title: 'The call rings out', text: 'Twilio forwards the call to the owner for 20 seconds. Nobody picks up.', tag: 'Twilio' },
  { icon: ChatText, title: 'Texted back in seconds', text: 'An n8n workflow logs the missed call and sends the text-back, or the after-hours version.', tag: 'n8n' },
  { icon: Brain, title: 'Claude runs the conversation', text: 'Each reply goes to Claude with the price list, service area and open slots.', tag: 'Claude' },
  { icon: CalendarCheck, title: 'Booked or escalated', text: 'Routine jobs land in a free slot. Emergencies text the owner straight away.', tag: 'n8n' },
  { icon: EnvelopeSimple, title: 'Follow-ups and a daily email', text: 'Quiet callers get two gentle nudges. The owner gets a summary at 6pm.', tag: 'Gmail' }
];

export default function Live() {
  return (
    <div className="live-page">
      <LiveStage />
      <section className="flow" aria-labelledby="flow-title">
        <h2 id="flow-title" className="section-title">What runs behind the demo</h2>
        <ol className="flow-list">
          {FLOW.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.li key={f.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ delay: i * 0.07, duration: 0.45 }}>
                <div className="flow-card">
                  <span className="flow-step">{i + 1}</span>
                  <span className="flow-icon"><Icon size={20} weight="duotone" /></span>
                  <strong>{f.title}</strong>
                  <p>{f.text}</p>
                  <span className="flow-tag">{f.tag}</span>
                </div>
                {i < FLOW.length - 1 && <CaretRight className="flow-arrow" size={16} weight="bold" aria-hidden="true" />}
              </motion.li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
