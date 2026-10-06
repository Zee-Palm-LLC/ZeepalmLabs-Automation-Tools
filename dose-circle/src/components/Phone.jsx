import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CaretLeft, ArrowUp, CellSignalFull, WifiHigh, BatteryFull } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { Mark } from './Shell.jsx';
import { Avatar } from './ui.jsx';
import { phone as fmtPhone, clock } from '../lib/format.js';
import { zoned } from '../demo/engine.js';

const hhmm = t => new Date(t).toLocaleTimeString('en-US', zoned({ hour: 'numeric', minute: '2-digit' })).replace(/ ?[AP]M$/, '');

function StatusBar({ now, dark }) {
  return (
    <div className={'phone-status' + (dark ? ' on-dark' : '')}>
      <span>{hhmm(now)}</span>
      <span className="phone-island" aria-hidden="true" />
      <span className="phone-glyphs" aria-hidden="true"><CellSignalFull size={14} weight="fill" /><WifiHigh size={14} weight="bold" /><BatteryFull size={18} weight="fill" /></span>
    </div>
  );
}

export default function Phone({ owner, thread, since, big, caption, note, draft, auto, chips = [], onSend, idle, idleText }) {
  const { data, now, visible, typing } = useCare();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState(null);
  const scroller = useRef(null);
  const lastOut = useRef(null);
  const msgs = thread && !idle ? visible(thread, since || 0) : [];
  const dots = thread && !idle ? typing(thread) : false;
  const outs = msgs.filter(m => m.dir === 'out');
  const newest = outs[outs.length - 1];
  const shown = auto ? draft || '' : text;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, dots, shown]);

  useEffect(() => {
    if (!newest) return undefined;
    if (lastOut.current === null) {
      lastOut.current = newest.id;
      if (now - Date.parse(newest.at) > 4000) return undefined;
    } else if (lastOut.current === newest.id) return undefined;
    lastOut.current = newest.id;
    setBanner(newest);
    return undefined;
  }, [newest ? newest.id : null]);

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(t);
  }, [banner]);

  const send = async body => {
    const b = String(body ?? text).trim();
    if (!b || sending || !onSend) return;
    setSending(true);
    setText('');
    try {
      await onSend(b);
    } finally {
      setSending(false);
    }
  };

  return (
    <figure className={'phone' + (big ? ' is-big' : '')}>
      <div className="phone-screen">
        <StatusBar now={now} dark={idle} />
        {idle ? (
          <div className="phone-lock">
            <div className="lock-clock">
              <span>{new Date(now).toLocaleDateString('en-US', zoned({ weekday: 'long', month: 'long', day: 'numeric' }))}</span>
              <strong>{hhmm(now)}</strong>
            </div>
            <p>{idleText}</p>
          </div>
        ) : (
          <>
            <div className="phone-head">
              <CaretLeft size={20} weight="bold" />
              <Mark size={30} />
              <div className="phone-who"><strong>Dose Circle</strong><span>{fmtPhone(data.settings.textingNumber)}</span></div>
            </div>
            <div className="phone-body" ref={scroller}>
              {msgs[0] && <p className="phone-day">Today {clock(msgs[0].at)}</p>}
              <AnimatePresence initial={false}>
                {msgs.map(m => (
                  <motion.div
                    key={m.id}
                    layout="position"
                    className={'bubble ' + (m.dir === 'in' ? 'me' : 'them') + (m.kind === 'alert' && /^URGENT/.test(m.body) ? ' is-urgent' : '')}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    {m.body}
                  </motion.div>
                ))}
                {dots && (
                  <motion.div key="typing" className="bubble them dots" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-label="Dose Circle is typing">
                    <i /><i /><i />
                  </motion.div>
                )}
              </AnimatePresence>
              {!msgs.length && !dots && <p className="phone-wait">Waiting for a text…</p>}
            </div>
            {!auto && chips.length > 0 && (
              <div className="chips" role="list">
                {chips.map(c => <button key={c} type="button" role="listitem" onClick={() => send(c)} disabled={sending}>{c}</button>)}
              </div>
            )}
            <form className="composer" onSubmit={e => { e.preventDefault(); if (!auto) send(); }}>
              <input value={shown} onChange={e => setText(e.target.value)} placeholder="Text message" aria-label={'Reply as ' + (owner ? owner.name : '')} readOnly={auto} maxLength={320} />
              <button type="submit" disabled={!shown.trim() || sending || auto} aria-label="Send"><ArrowUp size={16} weight="bold" /></button>
            </form>
          </>
        )}
        <AnimatePresence>
          {banner && !idle && (
            <motion.div key={banner.id} className="phone-banner" initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -70, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
              <Mark size={26} />
              <span><b>Dose Circle</b><em>{banner.body}</em></span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="phone-home" aria-hidden="true" />
      </div>
      {caption && (
        <figcaption className="phone-cap">
          <Avatar who={owner} size={26} />
          <span><b>{caption}</b>{note && <em>{note}</em>}</span>
        </figcaption>
      )}
    </figure>
  );
}
