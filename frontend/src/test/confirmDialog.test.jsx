import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ConfirmDialog from '../components/items/ConfirmDialog';

function Harness({ withInput = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <a href="#outside">Outside link</a>
      <ConfirmDialog
        open={open}
        title="Confirm action"
        description="Are you sure?"
        confirmLabel="Confirm"
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      >
        {withInput ? (
          <div className="mt-3">
            <label htmlFor="clear-confirm">Type CLEAR</label>
            <input id="clear-confirm" />
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

describe('ConfirmDialog focus trap', () => {
  it('Tab from last focusable wraps to first', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    const dialog = await screen.findByRole('dialog');
    const cancel = screen.getByRole('button', { name: /cancel/i });
    const confirm = screen.getByRole('button', { name: /^confirm$/i });
    // Initial focus is Cancel
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Shift+Tab from first wraps to last', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    const cancel = await screen.findByRole('button', { name: /cancel/i });
    const confirm = screen.getByRole('button', { name: /^confirm$/i });
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it('focus cannot escape the dialog to background', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    await screen.findByRole('dialog');
    // Spam Tab — active element must remain inside dialog
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    expect(screen.getByRole('link', { name: /outside link/i })).not.toHaveFocus();
  });

  it('Escape closes the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('focus returns to the opener after close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: /open dialog/i });
    await user.click(opener);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('prefers focusing an input when present (CLEAR pattern)', async () => {
    const user = userEvent.setup();
    render(<Harness withInput />);
    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText(/type clear/i)).toHaveFocus();
  });

  it('single focusable element keeps focus on Tab', async () => {
    const user = userEvent.setup();
    function Single() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog
          open={open}
          title="Only cancel"
          confirmLabel="Confirm"
          disabled
          onCancel={() => setOpen(false)}
          onConfirm={() => {}}
        />
      );
    }
    render(<Single />);
    const cancel = await screen.findByRole('button', { name: /cancel/i });
    // Confirm is disabled so only Cancel is focusable
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
  });
});
