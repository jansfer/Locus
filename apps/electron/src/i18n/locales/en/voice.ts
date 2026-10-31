/** voice 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { voice as zhvoice } from '../zh-CN/voice'

export const voice: MirrorStructure<typeof zhvoice> = {
  status: {
    initial: 'Press the shortcut to start voice input',
    noSpeech: 'No speech detected',
    outputting: 'Outputting text...',
    finalizing: 'Finalizing transcription...',
    cancelled: 'Voice input cancelled',
    listening: 'Listening',
    preparingMic: 'Preparing microphone...',
    preparingMicShort: 'Preparing microphone',
    tidyingUp: 'Processing audio',
    pleaseSpeak: 'Start speaking',
    startHint: 'Waiting for Ctrl+~',
    disabled: 'Enable voice input in Settings first',
    micBlockedSettings: 'Microphone access is blocked. Allow Locus to access the microphone in System Settings',
    micNeeded: 'Microphone access is required for voice input',
    appTitle: 'Locus Voice Input',
    hintBar: 'Ctrl+~ to stop · Types at the external cursor · Writes to Chat / Agent while Locus is active',
    unknownError: 'Unknown error',
    outputFailed: 'Output failed: {message}',
  },
  errors: {
    micUnsupported: 'Microphone capture is not supported in this environment',
    audioUnsupported: 'Audio processing is not supported in this environment',
    micNotReady: 'Microphone not ready. Check system microphone permissions and device connection',
    permissionBlockedWin: 'Microphone access is blocked. Allow Locus in Windows Settings > Privacy & security > Microphone',
    noMicrophone: 'No usable microphone detected. Check that an input device is connected and enabled',
    micBusy: 'The microphone is currently unavailable. It may be in use by another app or blocked by privacy settings',
    micParamsUnsupported: 'The current microphone does not support the requested capture parameters. Try another input device',
    windowBlocked: 'This window is blocked from accessing the microphone. Check app permission settings',
    unknownMicError: 'Unknown microphone error',
    audioStartFailed: 'Failed to start audio processing. Trigger voice input again or check system audio permissions',
    audioClosed: 'Audio processing is closed. Trigger voice input again',
  },
}
