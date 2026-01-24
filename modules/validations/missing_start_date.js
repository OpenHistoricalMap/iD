import { t } from '../core/localizer';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { validationIssue, validationIssueFix } from '../core/validation';
import { osmTimelessFeatureTagValues } from '../osm/tags';

export function validationMissingStartDate(context) {
  const type = 'missing_start_date';

  const validation = function checkMissingStartDate(entity, graph) {
    // If start_date is not empty, return nothing
    if (entity.tags && (entity.tags.start_date || entity.tags['start_date:edtf'])) return [];
    // If entity has no tags, return nothing
    if (Object.keys(entity.tags).length === 0) return [];
    // Rule should be ignored for natural entities and waterways
    if (entity.tags && (
      (entity.tags.natural && osmTimelessFeatureTagValues[entity.tags.natural]) ||
      (entity.tags.waterway && osmTimelessFeatureTagValues[entity.tags.waterway]) ||
      (entity.tags.water && osmTimelessFeatureTagValues[entity.tags.water]))) return [];

    // If entity is a vertex node
    var osm = context.connection();
    var isUnloadedNode = entity.type === 'node' && osm && !osm.isDataLoaded(entity.loc);

    // Should skip this validation if node is unloaded, is a vertex or has parent relations
    if (isUnloadedNode ||
        // allow untagged nodes that are part of ways
        entity.geometry(graph) === 'vertex' ||
        // allow untagged entities that are part of relations
        entity.hasParentRelations(graph)) return [];

    const entityID = entity.id;

    function showReference(selection) {
        selection.selectAll('.issue-reference')
            .data([0])
            .enter()
            .append('div')
            .attr('class', 'issue-reference')
            .call(t.append('issues.missing_start_date.reference'));
    }

    return [new validationIssue({
      type: type,
      severity: 'warning',
      message: (context) => {
        const entity = context.hasEntity(entityID);
        return entity ? t.append('issues.missing_start_date.message', {
          feature: utilDisplayLabel(entity, context.graph())
        }) : '';
      },
      reference: showReference,
      entityIds: [entityID],
      dynamicFixes: () => {
        return [
          new validationIssueFix({ title: t.append('issues.fix.add_start_date.title')})
        ];
      }
    })];
  };

  validation.type = type;

  return validation;
}
