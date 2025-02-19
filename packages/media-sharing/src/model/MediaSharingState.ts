/**
 * Media Sharing states as defined in
 * https://github.com/genaris/didcomm.org/tree/feat/media-sharing/site/content/protocols/media-sharing/1.0#states
 */

export enum MediaSharingState {
  Init = 'init',
  MediaRequested = 'media-requested',
  MediaShared = 'media-shared',
  Done = 'done',
}
