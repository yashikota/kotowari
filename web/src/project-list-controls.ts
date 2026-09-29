import type { Label } from './types.ts';
import type { ProjectDisplayProperty } from './project-display.ts';
import type { ProjectBoardGroup } from './project-board.ts';
import type {
  ProjectBoardGrouping,
  ProjectFilterGroup,
  ProjectGroupBy,
  ProjectViewSearch,
} from './project-views.ts';

export type ProjectListControlsModel = {
  search: string;
  searchOperator: 'contains' | 'doesNotContain';
  advancedFilter: boolean;
  filterOperator: 'and' | 'or';
  advancedFilterGroup?: ProjectFilterGroup;
  statuses: string[];
  priorities: string[];
  healths: string[];
  leads: Array<'self' | 'none'>;
  labels: string[];
  templates: string[];
  initiatives: string[];
  groupBy: ProjectGroupBy;
  orderBy: NonNullable<ProjectViewSearch['orderBy']>;
  direction: NonNullable<ProjectViewSearch['direction']>;
  closed: string;
  view: string;
  columnsBy: ProjectBoardGrouping;
  rowsBy: 'none' | ProjectBoardGrouping;
  showEmptyColumns: boolean;
  boardGroups: ProjectBoardGroup[];
  showProjectList: boolean;
  showWeekNumbers: boolean;
  displayProperties: ProjectDisplayProperty[];
  dateField: string;
  dateFrom: string;
  dateTo: string;
  milestones: string[];
  relations: string[];
  availableMilestones: string[];
  availableTemplates: { value: string; label: string }[];
  availableInitiatives: { value: string; label: string }[];
  availableProjects?: { value: string; label: string }[];
  specificProject?: string;
  availableLabels: Label[];
  filterCount: number;
  handlers: {
    onAdvancedFilterToggle: () => void;
    onAdvancedFilterGroupChange: (value: ProjectFilterGroup) => void;
    onSearchChange: (value: string) => void;
    onSearchOperatorChange: (value: string | null) => void;
    onStatusesChange: (value: string[]) => void;
    onPrioritiesChange: (value: string[]) => void;
    onHealthsChange: (value: string[]) => void;
    onLeadsChange: (value: Array<'self' | 'none'>) => void;
    onLabelsChange: (value: string[]) => void;
    onTemplatesChange: (value: string[]) => void;
    onInitiativesChange: (value: string[]) => void;
    onDateFieldChange: (value: string | null) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onMilestonesChange: (value: string[]) => void;
    onRelationsChange: (value: string[]) => void;
    onSpecificProjectChange: (value: string | null) => void;
    onGroupByChange: (value: ProjectGroupBy | null) => void;
    onOrderByChange: (value: string | null) => void;
    onSortProperty: (property: ProjectDisplayProperty | 'name') => void;
    onDirectionChange: (value: string | null) => void;
    onClosedChange: (value: string | null) => void;
    onViewChange: (value: 'list' | 'board' | 'timeline') => void;
    onColumnsByChange: (value: string | null) => void;
    onRowsByChange: (value: string | null) => void;
    onShowEmptyColumnsChange: (value: boolean) => void;
    onMoveBoardGroup: (key: string, destinationIndex: number) => void;
    onBoardGroupVisibilityChange: (key: string, visible: boolean) => void;
    onShowProjectListChange: (value: boolean) => void;
    onShowWeekNumbersChange: (value: boolean) => void;
    onDisplayPropertyToggle: (property: ProjectDisplayProperty) => void;
    onReset: () => void;
  };
};
