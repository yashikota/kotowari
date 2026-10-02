import { Textarea, type TextareaProps } from '@mantine/core';
import type { Ref } from 'react';

/** Editable document heading shared by pages and decisions. */
export function DocumentTitle(props: TextareaProps & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <Textarea
      {...props}
      autosize
      minRows={1}
      variant="unstyled"
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      styles={{ input: { fontSize: 'var(--mantine-h3-font-size)', fontWeight: 600, padding: 0 } }}
    />
  );
}
