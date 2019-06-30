import { Track } from '../../music/track';

/**
 * Represents cached track selections.
 */
export type TrackSelectionCache = {
  [guild: string]: {
    [search: string]: {
      tracks: Track[];
      expire: NodeJS.Timer;
    };
  };
};
