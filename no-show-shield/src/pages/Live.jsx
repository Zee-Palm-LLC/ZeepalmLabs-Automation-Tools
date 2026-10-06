import { motion } from 'motion/react';
import { Clock, ChatText, Brain, ArrowsClockwise, EnvelopeSimple, CaretRight } from '@phosphor-icons/react';
import { LiveStage } from '../components/LiveStage.jsx';

const FLOW = [
  { icon: Clock, title: 'Checks every 15 minutes', text: 'An n8n schedule finds visits 3 days, 1 day and 2 hours away and scores each one for no-show risk.', tag: 'n8n' },
  { icon: ChatText, title: 'Texts the reminder', text: 'Twilio sends it inside opening hours. It names the time, never the treatment.', tag: 'Twilio' },
  { icon: Brain, title: 'Claude reads the reply', text: 'Confirm, move, cancel, a question or a health worry. Anything medical goes to a person.', tag: 'Claude' },
  { icon: ArrowsClockwise, title: 'Freed times get refilled', text: 'The best matches on the waitlist get a text. The first YES gets the time.', tag: 'n8n' },
  { icon: EnvelopeSimple, title: 'A call list at 7:30', text: 'The front desk gets the high-risk patients who never replied, so they can call them first.', tag: 'Gmail' }
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
