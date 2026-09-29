import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import type { IssueLink } from '../types.ts';

type ComposerLink = Pick<IssueLink, 'url' | 'title' | 'kind'>;

export function useIssueComposerLinks() {
  const [links, setLinks] = useState<ComposerLink[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [url, setURL] = useState('');
  const [title, setTitle] = useState('');

  function reset(nextLinks: ComposerLink[] = []) {
    setLinks(nextLinks.map((link) => ({ ...link })));
    setIsOpen(false);
    setURL('');
    setTitle('');
  }

  function open() {
    setURL('');
    setTitle('');
    setIsOpen(true);
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedURL = url.trim();
    if (!normalizedURL || links.some((link) => link.url === normalizedURL)) return;
    setLinks((current) => [
      ...current,
      {
        url: normalizedURL,
        ...(title.trim() ? { title: title.trim() } : {}),
        kind: 'link',
      },
    ]);
    setIsOpen(false);
    setURL('');
    setTitle('');
  }

  return {
    links,
    isOpen,
    url,
    title,
    reset,
    open,
    close: () => setIsOpen(false),
    onURLChange: (event: ChangeEvent<HTMLInputElement>) => setURL(event.target.value),
    onTitleChange: (event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value),
    add,
    remove: (linkURL: string) =>
      setLinks((current) => current.filter((link) => link.url !== linkURL)),
  };
}
