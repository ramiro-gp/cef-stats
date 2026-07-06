export interface UndoableActionOptions {
  text: string
  successText?: string
  errorText?: string
  commit: () => void | Promise<void>
}

export type ScheduleUndoableAction = (options: UndoableActionOptions) => void
