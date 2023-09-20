import { actionChangeTags } from '../actions/change_tags';
import { localizer, t } from '../core/localizer';
import { utilDisplayLabel, utilNormalizeDateString } from '../util';
import { validationIssue, validationIssueFix } from '../core/validation';

export function validationFormatting() {
    var type = 'invalid_format';

    var validation = function(entity) {
        var issues = [];

        function showReferenceDate(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .text(t.append('issues.invalid_format.date.reference'));
        }

        function validateDate(key, msgKey) {
            if (!entity.tags[key]) return;
            var normalized = utilNormalizeDateString(entity.tags[key]);
            if (normalized !== null && entity.tags[key] === normalized.value) return;
            issues.push(new validationIssue({
                type: type,
                subtype: 'date',
                severity: 'error',
                message: function(context) {
                    var entity = context.hasEntity(this.entityIds[0]);
                    return entity ? t.append('issues.invalid_format.date.message_' + msgKey,
                        { feature: utilDisplayLabel(entity, context.graph()) }) : '';
                },
                reference: showReferenceDate,
                entityIds: [entity.id],
                hash: key + entity.tags[key],
                dynamicFixes: function() {
                    var fixes = [];
                    if (normalized !== null) {
                        var localeDateString = normalized.date.toLocaleDateString(localizer.languageCode(), normalized.localeOptions);
                        fixes.push(new validationIssueFix({
                            title: t.append('issues.fix.reformat_date.title', { date: localeDateString }),
                            onClick: function(context) {
                                context.perform(function(graph) {
                                    var entityInGraph = graph.hasEntity(entity.id);
                                    if (!entityInGraph) return graph;
                                    var newTags = Object.assign({}, entityInGraph.tags);
                                    newTags[key] = normalized.value;
                                    return actionChangeTags(entityInGraph.id, newTags)(graph);
                                }, t.append('issues.fix.reformat_date.annotation'));
                            }
                        }));
                    }
                    fixes.push(new validationIssueFix({
                        icon: 'iD-operation-delete',
                        title: t.append('issues.fix.remove_tag.title'),
                        onClick: function(context) {
                            context.perform(function(graph) {
                                var entityInGraph = graph.hasEntity(entity.id);
                                if (!entityInGraph) return graph;
                                var newTags = Object.assign({}, entityInGraph.tags);
                                delete newTags[key];
                                return actionChangeTags(entityInGraph.id, newTags)(graph);
                            }, t.append('issues.fix.remove_tag.annotation'));
                        }
                    }));
                    return fixes;
                }
            }));
        }
        validateDate('start_date', 'start');
        validateDate('end_date', 'end');

        function isValidEmail(email) {
            // Emails in OSM are going to be official so they should be pretty simple
            // Using negated lists to better support all possible unicode characters (#6494)
            var valid_email = /^[^\(\)\\,":;<>@\[\]]+@[^\(\)\\,":;<>@\[\]\.]+(?:\.[a-z0-9-]+)*$/i;

            // An empty value is also acceptable
            return (!email || valid_email.test(email));
        }

        function showReferenceEmail(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.email.reference'));
        }

        /* see https://github.com/openstreetmap/iD/issues/6831#issuecomment-537121379
        function isSchemePresent(url) {
            var valid_scheme = /^https?:\/\//i;
            return (!url || valid_scheme.test(url));
        }
        function showReferenceWebsite(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.website.reference'));
        }

        if (entity.tags.website) {
            // Multiple websites are possible
            // If ever we support ES6, arrow functions make this nicer
            var websites = entity.tags.website
                .split(';')
                .map(function(s) { return s.trim(); })
                .filter(function(x) { return !isSchemePresent(x); });

            if (websites.length) {
                issues.push(new validationIssue({
                    type: type,
                    subtype: 'website',
                    severity: 'warning',
                    message: function(context) {
                        var entity = context.hasEntity(this.entityIds[0]);
                        return entity ? t.append('issues.invalid_format.website.message' + this.data,
                            { feature: utilDisplayLabel(entity, context.graph()), site: websites.join(', ') }) : '';
                    },
                    reference: showReferenceWebsite,
                    entityIds: [entity.id],
                    hash: websites.join(),
                    data: (websites.length > 1) ? '_multi' : ''
                }));
            }
        }*/

        if (entity.tags.email) {
            // Multiple emails are possible
            var emails = entity.tags.email
                .split(';')
                .map(function(s) { return s.trim(); })
                .filter(function(x) { return !isValidEmail(x); });

            if (emails.length) {
                issues.push(new validationIssue({
                    type: type,
                    subtype: 'email',
                    severity: 'warning',
                    message: function(context) {
                        var entity = context.hasEntity(this.entityIds[0]);
                        return entity ? t.append('issues.invalid_format.email.message' + this.data,
                            { feature: utilDisplayLabel(entity, context.graph()), email: emails.join(', ') }) : '';
                    },
                    reference: showReferenceEmail,
                    entityIds: [entity.id],
                    hash: emails.join(),
                    data: (emails.length > 1) ? '_multi' : ''
                }));
            }
        }

        return issues;
    };

    validation.type = type;

    return validation;
}
