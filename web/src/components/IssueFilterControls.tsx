import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Label } from '../types.ts';
import { LabelChip } from '../mantine-ui.tsx';

type SelectOption = { value: string; label: string; icon?: ReactNode };

export function FilterSelect({
  label,
  value,
  data,
  onChange,
  searchable = false,
}: {
  label: string;
  value: string | null;
  data: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Select
      aria-label={label}
      label={label}
      value={value}
      placeholder={t('filters.chooseValue')}
      data={data}
      searchable={searchable}
      allowDeselect={false}
      clearable
      nothingFoundMessage={t('filters.noOptions')}
      comboboxProps={{ withinPortal: false, shadow: 'md' }}
      onChange={(next) => onChange(next ?? '')}
    />
  );
}

export function FilterOptionList({
  label,
  options,
  value,
  selectedValues,
  onChange,
  searchable = false,
}: {
  label: string;
  options: SelectOption[];
  value?: string | null;
  selectedValues?: string[];
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const visibleOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <Stack gap="xs">
      {searchable ? (
        <TextInput
          aria-label={t('filters.searchOptions')}
          placeholder={t('filters.filterOptions')}
          leftSection={<IconSearch size={15} aria-hidden="true" />}
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      ) : null}
      {visibleOptions.length > 0 ? (
        <Stack gap={2} role="group" aria-label={label}>
          {visibleOptions.map((option) => (
            <FilterOptionButton
              key={option.value}
              label={option.label}
              icon={option.icon}
              selected={selectedValues?.includes(option.value) ?? value === option.value}
              onClick={() => onChange(option.value)}
            />
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" py="xs">
          {t('filters.noOptions')}
        </Text>
      )}
    </Stack>
  );
}

function FilterOptionButton({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'light' : 'subtle'}
      color="gray"
      size="compact-sm"
      fullWidth
      justify="flex-start"
      aria-pressed={selected}
      onClick={onClick}
      styles={{
        root: { minHeight: 30, height: 30, paddingInline: 8 },
        label: { display: 'block', width: '100%', textAlign: 'left' },
      }}
    >
      <Group gap="xs" wrap="nowrap" justify="space-between" w="100%">
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          {icon}
          <Text size="sm" truncate>
            {label}
          </Text>
        </Group>
        {selected ? <IconCheck size={14} aria-hidden="true" /> : null}
      </Group>
    </Button>
  );
}

export function FilterLabelList({
  labels,
  selectedLabels,
  label,
  onToggle,
}: {
  labels: Label[];
  selectedLabels: string[];
  label: string;
  onToggle: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const filteredLabels = labels.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return labels.length > 0 ? (
    <Stack gap="xs" role="group" aria-label={label}>
      <TextInput
        aria-label={t('filters.searchOptions')}
        placeholder={t('filters.filterOptions')}
        leftSection={<IconSearch size={15} aria-hidden="true" />}
        value={query}
        autoFocus
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {filteredLabels.length > 0 ? (
        <Group gap={4}>
          {filteredLabels.map((item) => (
            <LabelChip
              key={item.id}
              name={item.name}
              color={item.color}
              selected={selectedLabels.includes(item.name)}
              onClick={() => onToggle(item.name)}
            />
          ))}
        </Group>
      ) : (
        <Text size="sm" c="dimmed">
          {t('filters.noOptions')}
        </Text>
      )}
    </Stack>
  ) : (
    <Text size="sm" c="dimmed">
      {t('filters.noLabels')}
    </Text>
  );
}
