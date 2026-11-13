import { HelpButton, HelpButtonOptions } from './help-button';
import { TypeSelector, TypeSelectorOptions } from './type-selector';
import { ReportForm, ReportFormOptions } from './report-form';
import { ScreenshotButton, ScreenshotButtonOptions } from './screenshot-button';
import { RecordButton, RecordButtonOptions } from './record-button';
import { AttachmentList, AttachmentListOptions } from './attachment-list';
import { SubmitBar, SubmitBarOptions } from './submit-bar';

export * from './help-button';
export * from './type-selector';
export * from './report-form';
export * from './screenshot-button';
export * from './record-button';
export * from './attachment-list';
export * from './submit-bar';

/**
 * Prebuilt component kit per spec Section 9.
 * Allows sites to embed individual components (e.g. only record button) into their own UI,
 * or allows the component gallery to render every state for review.
 */
export const components = {
  HelpButton,
  TypeSelector,
  ReportForm,
  ScreenshotButton,
  RecordButton,
  AttachmentList,
  SubmitBar,

  createHelpButton: (options?: HelpButtonOptions) => new HelpButton(options),
  createTypeSelector: (options?: TypeSelectorOptions) => new TypeSelector(options),
  createReportForm: (options?: ReportFormOptions) => new ReportForm(options),
  createScreenshotButton: (options?: ScreenshotButtonOptions) => new ScreenshotButton(options),
  createRecordButton: (options?: RecordButtonOptions) => new RecordButton(options),
  createAttachmentList: (options?: AttachmentListOptions) => new AttachmentList(options),
  createSubmitBar: (options?: SubmitBarOptions) => new SubmitBar(options)
};
