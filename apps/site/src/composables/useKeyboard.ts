import { onMounted, onUnmounted, ref } from 'vue';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboard(shortcuts: KeyboardShortcut[] = []) {
  const activeShortcuts = ref<KeyboardShortcut[]>(shortcuts);

  const handleKeyDown = (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      // Allow Escape to work even in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    for (const shortcut of activeShortcuts.value) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatches = !!shortcut.shift === event.shiftKey;
      const altMatches = !!shortcut.alt === event.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  };

  const addShortcut = (shortcut: KeyboardShortcut) => {
    activeShortcuts.value.push(shortcut);
  };

  const removeShortcut = (key: string) => {
    activeShortcuts.value = activeShortcuts.value.filter((s) => s.key !== key);
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    addShortcut,
    removeShortcut,
    shortcuts: activeShortcuts,
  };
}

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(containerRef: { value: HTMLElement | null }) {
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const trapFocus = (event: KeyboardEvent) => {
    if (!containerRef.value || event.key !== 'Tab') return;

    const focusableElements = containerRef.value.querySelectorAll(focusableSelector);
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  const activate = () => {
    if (containerRef.value) {
      const firstFocusable = containerRef.value.querySelector(focusableSelector) as HTMLElement;
      firstFocusable?.focus();
    }
    window.addEventListener('keydown', trapFocus);
  };

  const deactivate = () => {
    window.removeEventListener('keydown', trapFocus);
  };

  return {
    activate,
    deactivate,
  };
}

/**
 * Announce message to screen readers
 */
export function useAnnounce() {
  let announcer: HTMLElement | null = null;

  const createAnnouncer = () => {
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(announcer);
    }
    return announcer;
  };

  const announce = (message: string) => {
    const el = createAnnouncer();
    el.textContent = '';
    // Small delay to ensure screen readers pick up the change
    setTimeout(() => {
      el.textContent = message;
    }, 50);
  };

  return { announce };
}
