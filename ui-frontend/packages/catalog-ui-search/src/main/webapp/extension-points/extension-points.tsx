/**
 * Copyright (c) Codice Foundation
 *
 * This is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser
 * General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
 * even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details. A copy of the GNU Lesser General Public License
 * is distributed along with this program and can be found at
 * <http://www.gnu.org/licenses/lgpl.html>.
 *
 **/
import { SFC } from '../react-component/hoc/utils'
import { providers, Props as ProviderProps } from './providers'
import visualizations from './visualizations'
import navigationRight from './navigation-right'
import metacardInteractions from './metacard-interactions'
import searchInteractions, {
  SearchInteractionProps,
} from './search-interactions'
import { tableExport, Props as TableExportProps } from './table-export'
import multiSelectActions from './multi-select-actions'
import userSettings from './user-settings'
import { DetermineInputType } from '../react-component/filter/filter-input/filterInputHelper'

export type ExtensionPointsType = {
  providers: SFC<ProviderProps>
  visualizations: any[]
  navigationRight: any[]
  metacardInteractions: any[]
  searchInteractions: SFC<SearchInteractionProps>
  tableExport: SFC<TableExportProps>
  multiSelectActions: any[]
  userSettings: React.ReactNode
  customFilterInput: (props: DetermineInputType) => React.ReactNode | undefined
}

const ExtensionPoints: ExtensionPointsType = {
  providers,
  visualizations,
  navigationRight,
  metacardInteractions,
  searchInteractions,
  tableExport,
  multiSelectActions,
  userSettings,
  customFilterInput: () => undefined,
}

export default ExtensionPoints
