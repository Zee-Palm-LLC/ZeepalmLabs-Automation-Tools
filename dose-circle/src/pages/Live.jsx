import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, ArrowCounterClockwise, Stop, HandPointing, BellRinging, ChatCircleDots, Sparkle, Note, CheckCircle, Siren, Clock, Package, Heartbeat, Robot } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import Phone from '../components/Phone.jsx';
import { Compartment } from '../components/Pillbox.jsx';
import { PillIcon } from '../components/Pill.jsx';
import { Tag } from '../components/ui.jsx';
import { SCENARIOS } from '../demo/scenarios.js';
import { personOf, memberOf, medOf } from '../lib/metrics.js';
import { first } from '../lib/format.js';
import { DOSE_STATUS, slotOf, weekdayOf, medLabel, zoned } from '../demo/engine.js';

const PERSON_CHIPS = ['Took them', 'Not yet, after lunch', 'Took them but not the big white one', 'BP 150/95 this morning', 'Only 2 of the yellow ones left', 'What is the big white one for?', 'I feel dizzy'];
const MEMBER_CHIPS = ['On it', 'Done, she took them', 'Ordered', 'Picked up', 'Status?'];

const secs = t => new Date(t).toLocaleTimeString('en-US', zoned({ hour: 'numeric', minute: '2-digit', second: '2-digit' })).replace(/ ?[AP]M$/, '');

const INTENT = {
  taken: ['Taken', 'good'], partial: ['Skipped one', 'warn'], skipped: ['Skipped', 'quiet'], later: ['Remind me later', 'blue'], symptom: ['Not feeling well', 'warn'], emergency: ['Possible emergency', 'bad'], double: ['Extra dose', 'bad'],
  low: ['Running low', 'blue'], reading: ['Reading', 'violet'], question: ['Question', 'violet'], callback: ['Wants a call', 'violet'], thanks: ['Thanks', 'quiet'], other: ['Unclear', 'quiet'],
  ack: ['On it', 'good'], done: ['Done', 'good'], ordered: ['Ordered', 'blue'], picked: ['Picked up', 'good'], status: ['Status', 'quiet']
};

function events(data, sim) {
  const ids = [sim.personId, ...data.circle.map(m => m.id)];
  const fresh = (sim.startedAt || 0) - 1500;
  const out = [];
  for (const m of data.messages) {
    if (!ids.includes(m.thread) || Date.parse(m.at) < sim.since) continue;
    if (m.thread !== sim.personId && Date.parse(m.at) < fresh) continue;
    const p = personOf(data, m.thread);
    const mem = memberOf(data, m.thread);
    const name = first((p || mem || {}).name);
    if (m.dir === 'in') out.push({ id: m.id, at: m.at, icon: ChatCircleDots, tone: m.intent === 'emergency' ? 'bad' : 'in', title: name + ' replied', quote: m.body, intent: m.intent });
    else if (m.dir === 'note') out.push({ id: m.id, at: m.at, icon: Note, tone: m.kind === 'urgent' ? 'bad' : 'note', title: m.body });
    else if (m.kind === 'dose') out.push({ id: m.id, at: m.at, icon: BellRinging, tone: 'out', title: 'Reminder texted to ' + name });
    else if (m.kind === 'nudge') out.push({ id: m.id, at: m.at, icon: Clock, tone: 'out', title: 'No reply in ' + data.settings.nudgeMinutes + ' minutes, so a gentle nudge' });
    else if (mem && m.kind === 'alert') out.push({ id: m.id, at: m.at, icon: /^URGENT/.test(m.body) ? Siren : Sparkle, tone: /^URGENT/.test(m.body) ? 'bad' : 'fam', title: 'Texted ' + name, quote: m.body });
    else if (mem && m.kind === 'refill') out.push({ id: m.id, at: m.at, icon: Package, tone: 'fam', title: 'Refill text to ' + name, quote: m.body });
    else if (mem && (m.kind === 'fyi' || m.kind === 'resolved')) out.push({ id: m.id, at: m.at, icon: CheckCircle, tone: 'fam', title: 'Kept ' + name + ' in the loop', quote: m.body });
    else if (mem) out.push({ id: m.id, at: m.at, icon: Robot, tone: 'reply', title: 'Answered ' + name, quote: m.body });
    else out.push({ id: m.id, at: m.at, icon: Robot, tone: 'reply', title: 'Answered ' + name, quote: m.body });
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export default function Live() {
  const { data, now, sim, setSim, startDemo, sendAs, endSim, visible, typing, act, busy } = useCare();
  const [pick, setPick] = useState(sim.scenario || 'quiet');
  const [prog, setProg] = useState({ at: null, step: 0 });
  const step = prog.at === sim.startedAt ? prog.step : 0;
  const setStep = fn => setProg(p => ({ at: sim.startedAt, step: fn(p.at === sim.startedAt ? p.step : 0) }));
  const [drafts, setDrafts] = useState({ person: '', member: '' });
  const runner = useRef({ key: null, timer: null });
  const running = sim.phase === 'running';
  const sc = SCENARIOS.find(x => x.key === (running ? sim.scenario : pick)) || SCENARIOS[0];
  const p = personOf(data, sim.personId || data.people[0].id);
  const member = memberOf(data, sim.memberId || data.settings.viewer) || data.circle[0];
  const dose = sim.doseId ? data.doses.find(d => d.id === sim.doseId) : null;

  useEffect(() => {
    clearTimeout(runner.current.timer);
    runner.current.key = null;
    setDrafts({ person: '', member: '' });
  }, [sim.startedAt]);

  useEffect(() => () => clearTimeout(runner.current.timer), []);

  const st = running && sim.auto ? sim.steps[step] : null;
  let ready = false;
  if (st) {
    const thread = st.who === 'person' ? sim.personId : sim.memberId;
    const msgs = visible(thread, sim.since);
    const last = msgs[msgs.length - 1];
    const pendingFuture = data.messages.some(m => (m.thread === sim.personId || m.thread === sim.memberId) && Date.parse(m.at) > now);
    const quiet = !typing(sim.personId) && !typing(sim.memberId) && !pendingFuture;
    ready = quiet && (st.fresh === false || (!!last && last.dir === 'out' && Date.parse(last.at) >= sim.startedAt - 1500));
  }

  useEffect(() => {
    if (!ready || !st) return;
    const key = sim.startedAt + ':' + step;
    if (runner.current.key === key) return;
    runner.current.key = key;
    const text = st.text;
    const who = st.who;
    let i = 0;
    const tick = () => {
      i += 1;
      setDrafts(d => ({ ...d, [who]: text.slice(0, i) }));
      if (i < text.length) runner.current.timer = setTimeout(tick, 26 + Math.random() * 26);
      else runner.current.timer = setTimeout(async () => {
        await sendAs(who, text);
        setDrafts(d => ({ ...d, [who]: '' }));
        setStep(x => x + 1);
      }, 360);
    };
    runner.current.timer = setTimeout(tick, st.gap || 1300);
  }, [ready, step, sim.startedAt]);

  const log = useMemo(() => (running ? events(data, sim).filter(e => Date.parse(e.at) <= now) : []), [data, sim, now, running]);
  const done = running && sim.auto && step >= sim.steps.length && !data.messages.some(m => Date.parse(m.at) > now);
  const manual = running && !sim.auto;
  const ds = dose ? DOSE_STATUS[dose.status] : null;

  const play = key => {
    setPick(key);
    startDemo(key);
  };

  return (
    <div className="live">
      <section className="live-intro">
        <div>
          <h2>Be the family for a minute</h2>
          <p>Pick what Mom does with her reminder. Both phones are real conversations with the same engine the n8n workflows run, so the pillbox, alerts and refills on every other page change too.</p>
        </div>
        <div className="live-controls">
          {running ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => startDemo(sim.scenario)}><ArrowCounterClockwise size={16} weight="bold" /> Play again</button>
              <button type="button" className="btn btn-ghost" onClick={endSim}><Stop size={16} weight="fill" /> Stop</button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('reset', {}, 'Demo family reset')}><ArrowCounterClockwise size={16} weight="bold" /> Reset demo data</button>
          )}
        </div>
      </section>

      <div className="stories" role="radiogroup" aria-label="What Mom does">
        {SCENARIOS.map(x => {
          const on = (running ? sim.scenario : pick) === x.key;
          return (
            <button key={x.key} type="button" role="radio" aria-checked={on} className={'story' + (on ? ' is-on' : '') + (on && running ? ' is-running' : '')} onClick={() => play(x.key)}>
              <span className="story-play">{on && running ? <span className="story-live" /> : <Play size={13} weight="fill" />}</span>
              <span className="story-text"><b>{x.label}</b><em>{x.blurb}</em></span>
            </button>
          );
        })}
      </div>

      <div className="stage">
        <Phone
          key={'p' + (sim.startedAt || 0)}
          owner={p}
          thread={running ? sim.personId : null}
          since={sim.since}
          big
          caption={first(p.name) + '’s phone'}
          note="Larger text, any phone that gets texts"
          draft={drafts.person}
          auto={!manual}
          chips={manual ? PERSON_CHIPS : []}
          onSend={b => sendAs('person', b)}
          idle={!running}
          idleText="Pick a story above to send Rosa her reminder."
        />

        <section className="engine" aria-live="polite">
          <header className="engine-head">
            {dose ? (
              <>
                <div className="engine-top">
                  <Compartment dose={dose} wd={weekdayOf(Date.parse(dose.due))} big now={now} />
                  <div>
                    <span className="engine-kicker">{first(p.name)}’s {slotOf(dose.slot).word} pills</span>
                    <Tag tone={ds.tone}>{ds.label}</Tag>
                  </div>
                </div>
                <ul className="engine-meds">
                  {dose.meds.map(x => {
                    const m = medOf(data, x.medId);
                    return m ? <li key={m.id} className={dose.missed.includes(m.id) ? 'is-skipped' : ''}><PillIcon pill={m.pill} size={22} /><span>{medLabel(m)}</span><em>{m.supply} left</em></li> : null;
                  })}
                </ul>
              </>
            ) : (
              <div className="engine-idle">
                <Robot size={26} weight="duotone" />
                <p><b>Behind the scenes</b>Every step Dose Circle takes shows up here as it happens.</p>
              </div>
            )}
          </header>
          <ol className="engine-log">
            <AnimatePresence initial={false}>
              {log.map(e => {
                const Icon = e.icon;
                const tag = e.intent && INTENT[e.intent];
                return (
                  <motion.li key={e.id} className={'ev ev-' + e.tone} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }}>
                    <span className="ev-icon"><Icon size={14} weight="fill" /></span>
                    <div>
                      <p>{e.title}{tag && <Tag tone={tag[1]} size="sm">{tag[0]}</Tag>}</p>
                      {e.quote && <q>{e.quote}</q>}
                    </div>
                    <time>{secs(e.at)}</time>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          <footer className="engine-foot">
            {done ? (
              <span className="engine-done"><CheckCircle size={16} weight="fill" /> Story finished. Open Today or Pillbox to see it everywhere.</span>
            ) : running && sim.auto ? (
              <button type="button" className="link" onClick={() => setSim(x => ({ ...x, auto: false }))}><HandPointing size={15} weight="bold" /> Let me type instead</button>
            ) : (
              <span>In this demo, replies are read by built-in rules, so nothing is sent and nothing costs money. In n8n, Claude reads them and Twilio sends the texts.</span>
            )}
          </footer>
        </section>

        <Phone
          key={'m' + (sim.startedAt || 0)}
          owner={member}
          thread={running ? sim.memberId : null}
          since={Math.max(sim.since || 0, (sim.startedAt || 0) - 1500)}
          caption={first(member.name) + '’s phone'}
          note={member.relation + ', ' + (member.note || 'primary contact').toLowerCase()}
          draft={drafts.member}
          auto={!manual}
          chips={manual ? MEMBER_CHIPS : []}
          onSend={b => sendAs('member', b)}
          idle={!running}
          idleText="Ana only hears from Dose Circle when something needs her."
        />
      </div>
    </div>
  );
}
