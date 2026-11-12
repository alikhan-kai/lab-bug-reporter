import { Check, Copy } from 'lucide-react';
import React, { useState } from 'react';
import styles from './ReportDetail.module.css';
import ui from './ui.module.css';

const COPIED_NOTICE_MS = 2000;

/** Copies text and reports for a moment that it worked. */
export function useCopy(): { isCopied: boolean; copy: (text: string) => void } {
  const [isCopied, setIsCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), COPIED_NOTICE_MS);
      })
      .catch((error: unknown) => console.error('Cannot copy to the clipboard', error));
  };
  return { isCopied, copy };
}

/**
 * A titled block of captured text with a Copy button, like the samples on a campus.codes problem page.
 * The content is rendered as text, never as markup: it comes from the reporting website.
 */
export const CodeBlock: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const { isCopied, copy } = useCopy();
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span>{title}</span>
        <button type="button" className={`${ui.button} ${ui.buttonSmall}`} onClick={() => copy(content)}>
          {isCopied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
          {isCopied ? 'Скопировано' : 'Copy'}
        </button>
      </div>
      <pre className={styles.codeBody}>{content}</pre>
    </div>
  );
};
