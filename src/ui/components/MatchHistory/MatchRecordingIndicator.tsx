/**
 * Match Recording Indicator component.
 * Per critique Phase 11.2: Create component per spec Section 9.1, lines 1123-1124.
 */

import { useState, useEffect } from 'react';

interface MatchRecordingIndicatorProps {
  matchId: string;
  isRecording?: boolean;
}

export function MatchRecordingIndicator({ matchId, isRecording = true }: MatchRecordingIndicatorProps) {
  // matchId would be used to track recording status per match in production
  void matchId;
  const [recordingStatus, setRecordingStatus] = useState<'recording' | 'paused' | 'stopped'>(isRecording ? 'recording' : 'stopped');

  useEffect(() => {
    setRecordingStatus(isRecording ? 'recording' : 'stopped');
  }, [isRecording]);

  if (recordingStatus === 'stopped') {
    return null;
  }

  return (
    <div className="match-recording-indicator" role="status" aria-live="polite">
      <span className="recording-dot" />
      <span className="recording-text">
        {recordingStatus === 'recording' ? 'Recording match' : 'Recording paused'}
      </span>
    </div>
  );
}

