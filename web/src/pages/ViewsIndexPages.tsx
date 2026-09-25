import { Box, Button, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { PageHeader, RouterNavLink } from '../mantine-ui.tsx';
import { ViewIcon } from '../components/ViewIcon.tsx';
import { useViewsIndexPresenter } from '../presenters/ViewsIndexPages.tsx';

export function ViewsIndexPageView({
  model,
}: {
  model: ReturnType<typeof useViewsIndexPresenter>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0:
      return (
        <Box h="100%" style={{ minHeight: 0, overflowY: 'auto' }}>
          <PageHeader
            title={t('nav.views')}
            actions={
              <Button
                type="button"
                size="xs"
                leftSection={<IconPlus size={14} aria-hidden />}
                onClick={model.handlers.onCreateView}
              >
                {t('nav.newView')}
              </Button>
            }
          />
          <Stack gap="md" p="md" maw={760} mx="auto">
            <Text size="sm" c="dimmed">
              {t('views.description')}
            </Text>
            {model.views.length === 0 ? (
              <Stack align="center" justify="center" py="xl" gap="xs">
                <Text fw={550}>{t('views.emptyTitle')}</Text>
                <Text size="sm" c="dimmed" ta="center">
                  {t('views.emptyDescription')}
                </Text>
                <Button
                  type="button"
                  variant="default"
                  size="xs"
                  leftSection={<IconPlus size={14} aria-hidden />}
                  onClick={model.handlers.onCreateView}
                >
                  {t('nav.newView')}
                </Button>
              </Stack>
            ) : (
              <Stack component="nav" aria-label={t('nav.savedViews')} gap={0}>
                {model.views.map((view) => (
                  <RouterNavLink
                    key={view.slug}
                    to="/views/$slug"
                    params={{ slug: view.slug }}
                    label={view.name}
                    description={view.description || undefined}
                    leftSection={<ViewIcon name={view.icon} size={14} />}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      );
  }
}

export function ViewsIndexPage() {
  return (
    <PresenterScope name="ViewsIndexPage">
      <ViewsIndexPageBinding />
    </PresenterScope>
  );
}

function ViewsIndexPageBinding() {
  const model = useViewsIndexPresenter();
  const handlers = useActions(model.handlers);
  return <ViewsIndexPageView model={{ ...model, handlers } as typeof model} />;
}
