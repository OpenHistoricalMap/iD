import {
    select as d3_select
} from 'd3-selection';

import { t } from '../../core/localizer';
import { uiTooltip } from '../tooltip';
import { uiSection } from '../section';

export function uiSectionDateRange(context) {

    var section = uiSection('date_ranges', context)
        .title(t('date_ranges.title'))
        .disclosureContent(renderDisclosureContent)
        .expandedByDefault(false);

    function renderDisclosureContent(selection) {
        var container = selection.selectAll('.date_ranges-container')
            .data([0]);

        container.enter()
            .append('div')
            .attr('class', 'map-data-date-ranges')
            .merge(container)
    }

   return section;
}