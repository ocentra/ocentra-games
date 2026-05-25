import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  CompetitionProgramsResponseSchema,
  type CompetitionBracketMatch,
  type CompetitionEntryMode,
  type CompetitionMatchStatus,
  type CompetitionProgram,
  type CompetitionProgramsResponse,
  type CompetitionProgramStatus,
  type CompetitionProgramType,
  type CompetitionReward,
  type CompetitionStage,
  type CompetitionTournamentFormat,
} from '@ocentra/endpoint-domain/schemas/competition';

type CompetitionProgramsPanelTab =
  | 'overview'
  | 'program'
  | 'schedule'
  | 'entryRoutes'
  | 'tournament'
  | 'rewards'
  | 'rawJson';

type SelectOption<T extends string> = T | { value: T; label: string };

type CompetitionProgramsControlsPanelProps = {
  programsDocument: CompetitionProgramsResponse;
  onProgramsChange: Dispatch<SetStateAction<CompetitionProgramsResponse>>;
  onSave?: (programsDocument: CompetitionProgramsResponse) => Promise<string | void> | string | void;
};

const programTypes: CompetitionProgramType[] = ['event', 'tournament'];
const programStatuses: CompetitionProgramStatus[] = [
  'draft',
  'scheduled',
  'registration_open',
  'registration_closed',
  'check_in',
  'live',
  'completed',
  'cancelled',
];
const entryModes: CompetitionEntryMode[] = ['free', 'ticket', 'pass', 'invite'];
const tournamentFormats: CompetitionTournamentFormat[] = [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'groups_to_knockout',
  'swiss',
];
const stageTypes: CompetitionStage['type'][] = [
  'registration',
  'check_in',
  'group',
  'round',
  'semifinal',
  'final',
];
const matchStatuses: CompetitionMatchStatus[] = [
  'scheduled',
  'check_in',
  'waiting',
  'live',
  'completed',
  'forfeit',
];
const panelTabs: Array<{ id: CompetitionProgramsPanelTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'program', label: 'Program' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'entryRoutes', label: 'Entry & Routes' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'rawJson', label: 'Raw JSON' },
];

const shellStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  color: '#e0fbff',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const tabButtonStyle = (active: boolean): CSSProperties => ({
  appearance: 'none',
  border: '1px solid rgba(84,226,255,.32)',
  borderRadius: '0.45rem',
  background: active ? 'rgba(84,226,255,.2)' : 'rgba(5,18,31,.72)',
  color: active ? '#effcff' : '#bcecff',
  padding: '0.42rem 0.62rem',
  fontWeight: active ? 900 : 750,
  cursor: 'pointer',
});

const cardStyle: CSSProperties = {
  border: '1px solid rgba(84,226,255,.22)',
  borderRadius: '0.55rem',
  background: 'rgba(2,10,19,.66)',
  padding: '0.75rem',
  display: 'grid',
  gap: '0.65rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  gap: '0.65rem',
};

const splitGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(16rem, .75fr) minmax(20rem, 1.25fr)',
  gap: '0.85rem',
  alignItems: 'start',
};

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  gap: '0.75rem',
};

const summaryCardStyle: CSSProperties = {
  border: '1px solid rgba(84,226,255,.22)',
  borderRadius: '0.55rem',
  background: 'rgba(4,16,29,.72)',
  padding: '0.75rem',
  display: 'grid',
  gap: '0.35rem',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: '0.55rem',
};

const listItemStyle = (active: boolean): CSSProperties => ({
  border: `1px solid ${active ? 'rgba(84,226,255,.82)' : 'rgba(84,226,255,.24)'}`,
  borderRadius: '0.55rem',
  background: active ? 'rgba(30,130,160,.24)' : 'rgba(5,18,31,.78)',
  color: '#effcff',
  padding: '0.55rem',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '0.65rem',
  alignItems: 'center',
  textAlign: 'left',
});

const selectButtonStyle: CSSProperties = {
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  padding: 0,
  display: 'grid',
  gap: '0.15rem',
  textAlign: 'left',
  cursor: 'pointer',
  minWidth: 0,
};

const listActionBarStyle: CSSProperties = {
  display: 'flex',
  gap: '0.3rem',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.25rem',
  color: '#d9f7ff',
  fontSize: '0.78rem',
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: '1px solid rgba(84,226,255,.28)',
  borderRadius: '0.4rem',
  background: 'rgba(4,16,29,.92)',
  color: '#f0fdff',
  padding: '0.45rem 0.55rem',
};

const buttonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(84,226,255,.36)',
  borderRadius: '0.4rem',
  background: 'rgba(7,28,44,.84)',
  color: '#dcfbff',
  padding: '0.42rem 0.58rem',
  fontWeight: 850,
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: 'rgba(248,113,113,.44)',
  color: '#fecaca',
};

function optionValue<T extends string>(option: SelectOption<T>): T {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel<T extends string>(option: SelectOption<T>): string {
  return typeof option === 'string' ? option : option.label;
}

function linesFromText(value: string): string[] {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function optionalLinesFromText(value: string): string[] | undefined {
  const lines = linesFromText(value);
  return lines.length > 0 ? lines : undefined;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

function reorder<T>(items: T[], index: number, delta: number): T[] {
  const nextIndex = index + delta;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function nextIsoDate(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function newReward(): CompetitionReward {
  return {
    title: 'New reward',
    detail: 'Describe the prize, badge, credits, or placement reward.',
  };
}

function newStage(index: number): CompetitionStage {
  return {
    stageId: `stage-${Date.now()}-${index}`,
    title: `Stage ${index + 1}`,
    type: index === 0 ? 'registration' : 'round',
    status: 'scheduled',
  };
}

function newBracketMatch(index: number): CompetitionBracketMatch {
  return {
    matchId: `match-${Date.now()}-${index}`,
    roundId: 'round-1',
    label: `Match ${index + 1}`,
    status: 'scheduled',
  };
}

function newProgram(type: CompetitionProgramType = 'event'): CompetitionProgram {
  const startsAt = nextIsoDate(14);
  return {
    programId: `${type}-${Date.now()}`,
    programType: type,
    title: type === 'tournament' ? 'New Tournament' : 'New Event',
    subtitle: 'Draft competition program.',
    description: 'Describe the competitive format, entry requirement, check-in flow, and lobby handoff.',
    status: 'draft',
    featured: false,
    gameIds: ['claim'],
    variantIds: undefined,
    tags: [],
    region: 'Global',
    lifecycle: {
      startsAt,
      registrationOpensAt: nextIsoDate(7),
      registrationClosesAt: nextIsoDate(13),
      checkInOpensAt: startsAt,
    },
    entry: {
      mode: 'free',
      requirementLabel: 'Registration required',
    },
    rewards: [],
    stats: {
      registered: 0,
      capacity: type === 'tournament' ? 64 : 128,
      liveRooms: 0,
    },
    routes: {},
    tournament: type === 'tournament'
      ? {
          format: 'single_elimination',
          teamSize: 1,
          capacity: 64,
          seedMethod: 'rating',
          stages: [newStage(0), newStage(1)],
          bracket: [],
        }
      : undefined,
  };
}

function normalizeProgramsDocument(value: unknown): CompetitionProgramsResponse {
  return CompetitionProgramsResponseSchema.parse(value);
}

function TextField({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label style={wide ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      {label}
      <input style={inputStyle} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        style={inputStyle}
        value={value ?? ''}
        inputMode="numeric"
        onChange={event => onChange(numberOrUndefined(event.target.value))}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  wide = false,
  minHeight = '6rem',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  minHeight?: string;
}) {
  return (
    <label style={wide ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      {label}
      <textarea
        style={{ ...inputStyle, minHeight, resize: 'vertical' }}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <select style={inputStyle} value={value} onChange={event => onChange(event.target.value as T)}>
        {options.map(option => {
          const nextValue = optionValue(option);
          return <option key={nextValue} value={nextValue}>{optionLabel(option)}</option>;
        })}
      </select>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={{ ...labelStyle, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function programStatusLabel(status: CompetitionProgramStatus): string {
  return status.replace(/_/g, ' ');
}

export function CompetitionProgramsControlsPanel({
  programsDocument,
  onProgramsChange,
  onSave,
}: CompetitionProgramsControlsPanelProps) {
  const normalized = useMemo(() => normalizeProgramsDocument(programsDocument), [programsDocument]);
  const [activePanel, setActivePanel] = useState<CompetitionProgramsPanelTab>('overview');
  const [programIndex, setProgramIndex] = useState(0);
  const [rewardIndex, setRewardIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);
  const [rawJson, setRawJson] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const programs = normalized.programs;
  const safeProgramIndex = clampIndex(programIndex, programs.length);
  const selectedProgram = programs[safeProgramIndex];
  const rewards = selectedProgram?.rewards ?? [];
  const safeRewardIndex = clampIndex(rewardIndex, rewards.length);
  const selectedReward = rewards[safeRewardIndex];
  const tournament = selectedProgram?.tournament;
  const stages = tournament?.stages ?? [];
  const bracket = tournament?.bracket ?? [];
  const safeStageIndex = clampIndex(stageIndex, stages.length);
  const safeMatchIndex = clampIndex(matchIndex, bracket.length);
  const selectedStage = stages[safeStageIndex];
  const selectedMatch = bracket[safeMatchIndex];
  const publicPrograms = programs.filter(program => program.status !== 'draft');
  const eventCount = programs.filter(program => program.programType === 'event').length;
  const tournamentCount = programs.filter(program => program.programType === 'tournament').length;

  const updateDocument = (producer: (current: CompetitionProgramsResponse) => CompetitionProgramsResponse) => {
    onProgramsChange(previous => producer(normalizeProgramsDocument(previous)));
    setStatus('Unsaved program changes');
  };

  const updatePrograms = (nextPrograms: CompetitionProgram[], featuredProgramId = normalized.featuredProgramId) => {
    updateDocument(current => ({
      ...current,
      programs: nextPrograms,
      featuredProgramId: featuredProgramId && nextPrograms.some(program => program.programId === featuredProgramId)
        ? featuredProgramId
        : undefined,
    }));
  };

  const updateSelectedProgram = (producer: (program: CompetitionProgram) => CompetitionProgram) => {
    if (!selectedProgram) return;
    const nextProgram = producer(selectedProgram);
    updatePrograms(programs.map((program, index) => index === safeProgramIndex ? nextProgram : program));
  };

  const updateRewards = (nextRewards: CompetitionReward[]) => {
    updateSelectedProgram(program => ({ ...program, rewards: nextRewards }));
  };

  const updateStages = (nextStages: CompetitionStage[]) => {
    updateSelectedProgram(program => {
      const nextTournament = program.tournament ?? {
        format: 'single_elimination',
        teamSize: 1,
        capacity: program.stats.capacity ?? 64,
        seedMethod: 'rating',
        stages: [],
        bracket: [],
      };
      return { ...program, tournament: { ...nextTournament, stages: nextStages } };
    });
  };

  const updateBracket = (nextBracket: CompetitionBracketMatch[]) => {
    updateSelectedProgram(program => {
      const nextTournament = program.tournament ?? {
        format: 'single_elimination',
        teamSize: 1,
        capacity: program.stats.capacity ?? 64,
        seedMethod: 'rating',
        stages: [],
        bracket: [],
      };
      return { ...program, tournament: { ...nextTournament, bracket: nextBracket } };
    });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const result = await onSave(normalized);
      setStatus(typeof result === 'string' ? result : 'Competition programs saved');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={shellStyle}>
      <div style={toolbarStyle}>
        {panelTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            style={tabButtonStyle(activePanel === tab.id)}
            aria-pressed={activePanel === tab.id}
            onClick={() => setActivePanel(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button type="button" style={buttonStyle} disabled={isSaving} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save Programs'}
        </button>
      </div>

      {activePanel === 'overview' ? (
        <div style={cardStyle}>
          <div style={summaryGridStyle}>
            <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActivePanel('program')}>
              <span style={{ color: '#54e2ff', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase' }}>Programs</span>
              <strong style={{ fontSize: '1.15rem' }}>{programs.length} authored</strong>
              <span>{publicPrograms.length} public after draft filtering</span>
            </button>
            <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActivePanel('program')}>
              <span style={{ color: '#ffd36a', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase' }}>Types</span>
              <strong style={{ fontSize: '1.15rem' }}>{eventCount} events / {tournamentCount} tournaments</strong>
              <span>Events are fixed sessions; tournaments add stages and bracket data.</span>
            </button>
            <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActivePanel('entryRoutes')}>
              <span style={{ color: '#20e39d', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase' }}>Handoff</span>
              <strong style={{ fontSize: '1.15rem' }}>{programs.filter(program => program.routes.lobbyPath).length} lobby routes</strong>
              <span>Ticket/pass entries point to Shop; live check-in points to Lobby.</span>
            </button>
          </div>
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => {
              const next = [...programs, newProgram('event')];
              updatePrograms(next);
              setProgramIndex(next.length - 1);
              setActivePanel('program');
            }}>+ Event</button>
            <button type="button" style={buttonStyle} onClick={() => {
              const next = [...programs, newProgram('tournament')];
              updatePrograms(next);
              setProgramIndex(next.length - 1);
              setActivePanel('program');
            }}>+ Tournament</button>
          </div>
          {programs.length === 0 ? (
            <div style={summaryCardStyle}>
              <strong>No events or tournaments are authored.</strong>
              <span style={{ color: '#bcecff' }}>The public Competition page will stay in the honest beta waiting state until a real program is added and moved out of draft.</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {activePanel === 'program' ? (
        <div style={splitGridStyle}>
          <div style={cardStyle}>
            <div style={toolbarStyle}>
              <button type="button" style={buttonStyle} onClick={() => {
                const next = [...programs, newProgram('event')];
                updatePrograms(next);
                setProgramIndex(next.length - 1);
              }}>+ Event</button>
              <button type="button" style={buttonStyle} onClick={() => {
                const next = [...programs, newProgram('tournament')];
                updatePrograms(next);
                setProgramIndex(next.length - 1);
              }}>+ Tournament</button>
            </div>
            <div style={listStyle}>
              {programs.map((program, index) => (
                <div key={program.programId} style={listItemStyle(index === safeProgramIndex)}>
                  <button type="button" style={selectButtonStyle} onClick={() => setProgramIndex(index)}>
                    <strong>{program.title}</strong>
                    <span style={{ color: '#bcecff', fontSize: '0.76rem' }}>{program.programType} | {programStatusLabel(program.status)} | {program.gameIds.join(', ')}</span>
                    <span style={{ color: '#7dd3fc', fontSize: '0.72rem' }}>{program.entry.mode} | {program.lifecycle.startsAt}</span>
                  </button>
                  <span style={listActionBarStyle}>
                    <button type="button" style={buttonStyle} onClick={() => {
                      const copy: CompetitionProgram = {
                        ...program,
                        programId: `${program.programId}-copy-${Date.now()}`,
                        title: `${program.title} Copy`,
                        status: 'draft',
                        featured: false,
                      };
                      const next = [...programs.slice(0, index + 1), copy, ...programs.slice(index + 1)];
                      updatePrograms(next);
                      setProgramIndex(index + 1);
                    }}>Copy</button>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updatePrograms(reorder(programs, index, -1));
                      setProgramIndex(clampIndex(index - 1, programs.length));
                    }}>Up</button>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updatePrograms(reorder(programs, index, 1));
                      setProgramIndex(clampIndex(index + 1, programs.length));
                    }}>Down</button>
                    <button type="button" style={dangerButtonStyle} onClick={() => {
                      const next = programs.filter((_, programItemIndex) => programItemIndex !== index);
                      updatePrograms(next);
                      setProgramIndex(clampIndex(index - 1, next.length));
                    }}>X</button>
                  </span>
                </div>
              ))}
              {programs.length === 0 ? <div style={summaryCardStyle}>No programs yet.</div> : null}
            </div>
          </div>
          <div style={cardStyle}>
            {selectedProgram ? (
              <>
                <div style={gridStyle}>
                  <TextField label="Program ID" value={selectedProgram.programId} onChange={value => updateSelectedProgram(program => ({ ...program, programId: value }))} />
                  <TextField label="Title" value={selectedProgram.title} onChange={value => updateSelectedProgram(program => ({ ...program, title: value }))} />
                  <SelectField label="Type" value={selectedProgram.programType} options={programTypes} onChange={value => updateSelectedProgram(program => ({ ...program, programType: value, tournament: value === 'tournament' ? program.tournament ?? newProgram('tournament').tournament : undefined }))} />
                  <SelectField label="Status" value={selectedProgram.status} options={programStatuses.map(statusOption => ({ value: statusOption, label: programStatusLabel(statusOption) }))} onChange={value => updateSelectedProgram(program => ({ ...program, status: value }))} />
                  <TextField label="Subtitle" value={selectedProgram.subtitle} wide onChange={value => updateSelectedProgram(program => ({ ...program, subtitle: value }))} />
                  <TextAreaField label="Description" value={selectedProgram.description} wide onChange={value => updateSelectedProgram(program => ({ ...program, description: value }))} />
                  <TextAreaField label="Game IDs" value={selectedProgram.gameIds.join('\n')} onChange={value => updateSelectedProgram(program => ({ ...program, gameIds: linesFromText(value) }))} />
                  <TextAreaField label="Variant IDs" value={(selectedProgram.variantIds ?? []).join('\n')} onChange={value => updateSelectedProgram(program => ({ ...program, variantIds: optionalLinesFromText(value) }))} />
                  <TextAreaField label="Tags" value={selectedProgram.tags.join('\n')} onChange={value => updateSelectedProgram(program => ({ ...program, tags: linesFromText(value) }))} />
                  <TextField label="Region" value={selectedProgram.region ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, region: value || undefined }))} />
                  <CheckField label="Featured" checked={selectedProgram.featured} onChange={checked => updateSelectedProgram(program => ({ ...program, featured: checked }))} />
                  <CheckField label="Featured Program ID" checked={normalized.featuredProgramId === selectedProgram.programId} onChange={checked => updateDocument(current => ({ ...current, featuredProgramId: checked ? selectedProgram.programId : undefined }))} />
                </div>
              </>
            ) : (
              <div>Select or add a program.</div>
            )}
          </div>
        </div>
      ) : null}

      {activePanel === 'schedule' && selectedProgram ? (
        <div style={cardStyle}>
          <div style={gridStyle}>
            <TextField label="Starts At" value={selectedProgram.lifecycle.startsAt} onChange={value => updateSelectedProgram(program => ({ ...program, lifecycle: { ...program.lifecycle, startsAt: value } }))} />
            <TextField label="Ends At" value={selectedProgram.lifecycle.endsAt ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, lifecycle: { ...program.lifecycle, endsAt: value || undefined } }))} />
            <TextField label="Registration Opens At" value={selectedProgram.lifecycle.registrationOpensAt ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, lifecycle: { ...program.lifecycle, registrationOpensAt: value || undefined } }))} />
            <TextField label="Registration Closes At" value={selectedProgram.lifecycle.registrationClosesAt ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, lifecycle: { ...program.lifecycle, registrationClosesAt: value || undefined } }))} />
            <TextField label="Check-In Opens At" value={selectedProgram.lifecycle.checkInOpensAt ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, lifecycle: { ...program.lifecycle, checkInOpensAt: value || undefined } }))} />
            <TextField label="Check-In Closes At" value={selectedProgram.lifecycle.checkInClosesAt ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, lifecycle: { ...program.lifecycle, checkInClosesAt: value || undefined } }))} />
            <NumberField label="Registered" value={selectedProgram.stats.registered} onChange={value => updateSelectedProgram(program => ({ ...program, stats: { ...program.stats, registered: value } }))} />
            <NumberField label="Capacity" value={selectedProgram.stats.capacity} onChange={value => updateSelectedProgram(program => ({ ...program, stats: { ...program.stats, capacity: value } }))} />
            <NumberField label="Live Rooms" value={selectedProgram.stats.liveRooms} onChange={value => updateSelectedProgram(program => ({ ...program, stats: { ...program.stats, liveRooms: value } }))} />
            <TextField label="Prize Pool Label" value={selectedProgram.stats.prizePoolLabel ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, stats: { ...program.stats, prizePoolLabel: value || undefined } }))} />
          </div>
        </div>
      ) : null}

      {activePanel === 'entryRoutes' && selectedProgram ? (
        <div style={cardStyle}>
          <div style={gridStyle}>
            <SelectField label="Entry Mode" value={selectedProgram.entry.mode} options={entryModes} onChange={value => updateSelectedProgram(program => ({ ...program, entry: { ...program.entry, mode: value } }))} />
            <TextField label="Product ID" value={selectedProgram.entry.productId ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, entry: { ...program.entry, productId: value || undefined } }))} />
            <TextField label="Entitlement Kind" value={selectedProgram.entry.entitlementKind ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, entry: { ...program.entry, entitlementKind: value || undefined } }))} />
            <TextField label="Price Label" value={selectedProgram.entry.priceLabel ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, entry: { ...program.entry, priceLabel: value || undefined } }))} />
            <TextField label="Entry Shop Path" value={selectedProgram.entry.shopPath ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, entry: { ...program.entry, shopPath: value || undefined } }))} />
            <TextField label="Requirement Label" value={selectedProgram.entry.requirementLabel ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, entry: { ...program.entry, requirementLabel: value || undefined } }))} />
            <TextField label="Detail Path" value={selectedProgram.routes.detailPath ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, routes: { ...program.routes, detailPath: value || undefined } }))} />
            <TextField label="Lobby Path" value={selectedProgram.routes.lobbyPath ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, routes: { ...program.routes, lobbyPath: value || undefined } }))} />
            <TextField label="Shop Path" value={selectedProgram.routes.shopPath ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, routes: { ...program.routes, shopPath: value || undefined } }))} />
            <TextField label="Leaderboard Path" value={selectedProgram.routes.leaderboardPath ?? ''} onChange={value => updateSelectedProgram(program => ({ ...program, routes: { ...program.routes, leaderboardPath: value || undefined } }))} />
          </div>
        </div>
      ) : null}

      {activePanel === 'tournament' && selectedProgram ? (
        <div style={cardStyle}>
          {selectedProgram.programType !== 'tournament' ? (
            <div style={summaryCardStyle}>Switch this program to Tournament before authoring bracket fields.</div>
          ) : (
            <>
              <div style={gridStyle}>
                <SelectField label="Format" value={tournament?.format ?? 'single_elimination'} options={tournamentFormats} onChange={value => updateSelectedProgram(program => ({ ...program, tournament: { ...(program.tournament ?? newProgram('tournament').tournament!), format: value } }))} />
                <NumberField label="Team Size" value={tournament?.teamSize ?? 1} onChange={value => updateSelectedProgram(program => ({ ...program, tournament: { ...(program.tournament ?? newProgram('tournament').tournament!), teamSize: positiveNumber(String(value ?? 1), 1) } }))} />
                <NumberField label="Tournament Capacity" value={tournament?.capacity ?? selectedProgram.stats.capacity} onChange={value => updateSelectedProgram(program => ({ ...program, tournament: { ...(program.tournament ?? newProgram('tournament').tournament!), capacity: positiveNumber(String(value ?? program.stats.capacity ?? 64), 64) } }))} />
                <SelectField label="Seed Method" value={tournament?.seedMethod ?? 'rating'} options={['manual', 'random', 'rating', 'qualifier']} onChange={value => updateSelectedProgram(program => ({ ...program, tournament: { ...(program.tournament ?? newProgram('tournament').tournament!), seedMethod: value } }))} />
              </div>
              <div style={splitGridStyle}>
                <div style={cardStyle}>
                  <div style={toolbarStyle}>
                    <strong>Stages</strong>
                    <span style={{ flex: 1 }} />
                    <button type="button" style={buttonStyle} onClick={() => {
                      const next = [...stages, newStage(stages.length)];
                      updateStages(next);
                      setStageIndex(next.length - 1);
                    }}>+ Stage</button>
                    <button type="button" style={dangerButtonStyle} disabled={!selectedStage} onClick={() => {
                      const next = stages.filter((_, index) => index !== safeStageIndex);
                      updateStages(next);
                      setStageIndex(clampIndex(safeStageIndex - 1, next.length));
                    }}>Remove</button>
                  </div>
                  {stages.length > 0 ? (
                    <SelectField label="Selected Stage" value={String(safeStageIndex)} options={stages.map((stage, index) => ({ value: String(index), label: `${index + 1}. ${stage.title}` }))} onChange={value => setStageIndex(Number(value))} />
                  ) : null}
                  {selectedStage ? (
                    <div style={gridStyle}>
                      <TextField label="Stage ID" value={selectedStage.stageId} onChange={value => updateStages(stages.map((stage, index) => index === safeStageIndex ? { ...stage, stageId: value } : stage))} />
                      <TextField label="Title" value={selectedStage.title} onChange={value => updateStages(stages.map((stage, index) => index === safeStageIndex ? { ...stage, title: value } : stage))} />
                      <SelectField label="Type" value={selectedStage.type} options={stageTypes} onChange={value => updateStages(stages.map((stage, index) => index === safeStageIndex ? { ...stage, type: value } : stage))} />
                      <SelectField label="Status" value={selectedStage.status ?? 'scheduled'} options={matchStatuses} onChange={value => updateStages(stages.map((stage, index) => index === safeStageIndex ? { ...stage, status: value } : stage))} />
                      <TextField label="Starts At" value={selectedStage.startsAt ?? ''} onChange={value => updateStages(stages.map((stage, index) => index === safeStageIndex ? { ...stage, startsAt: value || undefined } : stage))} />
                    </div>
                  ) : null}
                </div>
                <div style={cardStyle}>
                  <div style={toolbarStyle}>
                    <strong>Bracket Matches</strong>
                    <span style={{ flex: 1 }} />
                    <button type="button" style={buttonStyle} onClick={() => {
                      const next = [...bracket, newBracketMatch(bracket.length)];
                      updateBracket(next);
                      setMatchIndex(next.length - 1);
                    }}>+ Match</button>
                    <button type="button" style={dangerButtonStyle} disabled={!selectedMatch} onClick={() => {
                      const next = bracket.filter((_, index) => index !== safeMatchIndex);
                      updateBracket(next);
                      setMatchIndex(clampIndex(safeMatchIndex - 1, next.length));
                    }}>Remove</button>
                  </div>
                  {bracket.length > 0 ? (
                    <SelectField label="Selected Match" value={String(safeMatchIndex)} options={bracket.map((match, index) => ({ value: String(index), label: `${index + 1}. ${match.label}` }))} onChange={value => setMatchIndex(Number(value))} />
                  ) : null}
                  {selectedMatch ? (
                    <div style={gridStyle}>
                      <TextField label="Match ID" value={selectedMatch.matchId} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, matchId: value } : match))} />
                      <TextField label="Round ID" value={selectedMatch.roundId} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, roundId: value } : match))} />
                      <TextField label="Label" value={selectedMatch.label} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, label: value } : match))} />
                      <SelectField label="Status" value={selectedMatch.status} options={matchStatuses} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, status: value } : match))} />
                      <TextField label="Scheduled At" value={selectedMatch.scheduledAt ?? ''} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, scheduledAt: value || undefined } : match))} />
                      <TextField label="Player A" value={selectedMatch.playerA ?? ''} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, playerA: value || undefined } : match))} />
                      <TextField label="Player B" value={selectedMatch.playerB ?? ''} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, playerB: value || undefined } : match))} />
                      <TextField label="Winner" value={selectedMatch.winner ?? ''} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, winner: value || undefined } : match))} />
                      <TextField label="Room ID" value={selectedMatch.roomId ?? ''} onChange={value => updateBracket(bracket.map((match, index) => index === safeMatchIndex ? { ...match, roomId: value || undefined } : match))} />
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {activePanel === 'rewards' && selectedProgram ? (
        <div style={cardStyle}>
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => {
              const next = [...rewards, newReward()];
              updateRewards(next);
              setRewardIndex(next.length - 1);
            }}>+ Reward</button>
            <button type="button" style={dangerButtonStyle} disabled={!selectedReward} onClick={() => {
              const next = rewards.filter((_, index) => index !== safeRewardIndex);
              updateRewards(next);
              setRewardIndex(clampIndex(safeRewardIndex - 1, next.length));
            }}>Remove Reward</button>
          </div>
          {rewards.length > 0 ? <SelectField label="Selected Reward" value={String(safeRewardIndex)} options={rewards.map((reward, index) => ({ value: String(index), label: `${index + 1}. ${reward.title}` }))} onChange={value => setRewardIndex(Number(value))} /> : null}
          {selectedReward ? (
            <div style={gridStyle}>
              <TextField label="Title" value={selectedReward.title} onChange={value => updateRewards(rewards.map((reward, index) => index === safeRewardIndex ? { ...reward, title: value } : reward))} />
              <TextField label="Detail" value={selectedReward.detail} wide onChange={value => updateRewards(rewards.map((reward, index) => index === safeRewardIndex ? { ...reward, detail: value } : reward))} />
              <NumberField label="Place" value={selectedReward.place} onChange={value => updateRewards(rewards.map((reward, index) => index === safeRewardIndex ? { ...reward, place: value } : reward))} />
              <NumberField label="Amount" value={selectedReward.amount} onChange={value => updateRewards(rewards.map((reward, index) => index === safeRewardIndex ? { ...reward, amount: value } : reward))} />
              <TextField label="Currency" value={selectedReward.currency ?? ''} onChange={value => updateRewards(rewards.map((reward, index) => index === safeRewardIndex ? { ...reward, currency: value || undefined } : reward))} />
            </div>
          ) : <div style={summaryCardStyle}>No rewards authored for this program.</div>}
        </div>
      ) : null}

      {activePanel === 'rawJson' ? (
        <div style={cardStyle}>
          <TextAreaField label="Competition programs JSON" value={rawJson || JSON.stringify(normalized, null, 2)} wide minHeight="20rem" onChange={setRawJson} />
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => setRawJson(JSON.stringify(normalized, null, 2))}>Refresh From Form</button>
            <button type="button" style={buttonStyle} onClick={() => {
              try {
                onProgramsChange(normalizeProgramsDocument(JSON.parse(rawJson || JSON.stringify(normalized))));
                setStatus('Applied JSON');
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Invalid JSON');
              }
            }}>Apply JSON</button>
          </div>
        </div>
      ) : null}

      {status ? <p style={{ color: '#bcecff', margin: 0 }}>{status}</p> : null}
    </section>
  );
}
