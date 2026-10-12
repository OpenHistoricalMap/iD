import { localizer, t } from '../core/localizer';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { utilNormalizeDateString, utilEDTFFromOSMDateString } from '../util';
import { validationIssue, validationIssueFix } from '../core/validation';
import { actionChangeTags } from '../actions/change_tags';
import { osmUrlKeys } from '../osm/tags';
import { showTagDiffReference } from './outdated_tags';
import { utilTagDiff, utilIsValidURL as isValidURL } from '../util/util';
import { presetManager } from '../presets';

import * as edtf from 'edtf';

export function validationFormatting(context) {
    var type = 'invalid_format';

    var validation = function(entity) {
        var issues = [];

        function showReferenceDate(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.date.reference'));
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

                    let alternatives = [];
                    if (normalized !== null) {
                        let label = normalized.date.toLocaleDateString(localizer.localeCodes(), normalized.localeOptions);
                        alternatives.push({
                            date: normalized.value,
                            label: label || normalized.value,
                        });
                    }
                    let edtfFromOSM = utilEDTFFromOSMDateString(entity.tags[key]);
                    if (edtfFromOSM) {
                        let label;
                        try {
                            label = edtf.default(edtfFromOSM).format(localizer.localeCode());
                        } catch {
                            label = edtfFromOSM;
                        }
                        alternatives.push({
                            edtf: edtfFromOSM,
                            label: label,
                        });
                    }

                    fixes.push(...alternatives.map(alt => new validationIssueFix({
                        title: t.append('issues.fix.reformat_date.title', { date: alt.label }),
                        onClick: function(context) {
                            context.perform(function(graph) {
                                var entityInGraph = graph.hasEntity(entity.id);
                                if (!entityInGraph) return graph;
                                var newTags = Object.assign({}, entityInGraph.tags);
                                if (alt.date) {
                                    newTags[key] = alt.date;
                                } else {
                                    delete newTags[key];
                                }
                                newTags[key + ':edtf'] = alt.edtf;
                                return actionChangeTags(entityInGraph.id, newTags)(graph);
                            }, t('issues.fix.reformat_date.annotation'));
                        }
                    })));

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
                            }, t('issues.fix.remove_tag.annotation'));
                        }
                    }));

                    return fixes;
                }
            }));
        }
        validateDate('start_date', 'start');
        validateDate('end_date', 'end');

        function showReferenceEDTF(selection, parserError) {
            let message;
            if (typeof parserError.offset === 'number' && parserError.token) {
                message = t.append('issues.invalid_format.edtf.reference', {
                    token: parserError.token.value,
                    position: (parserError.offset + 1).toLocaleString(localizer.localeCodes()),
                });
            } else if (parserError.message) {
                message = selection => selection.append('span')
                    .attr('class', 'localized-text')
                    .attr('lang', 'en')
                    .text(parserError.message.replace(/^edtf: /, ''));
            }
            if (!message) {
                return;
            }

            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(message);
        }

        function validateEDTF(key, msgKey) {
            key += ':edtf';
            if (!entity.tags[key]) return;
            let parserError;
            try {
                edtf.parse(entity.tags[key]);
                return;
            } catch (e) {
                parserError = e;
            }
            issues.push(new validationIssue({
                type: type,
                subtype: 'date',
                severity: 'warning',
                message: function(context) {
                    var entity = context.hasEntity(this.entityIds[0]);
                    return entity ? t.append('issues.invalid_format.edtf.message_' + msgKey,
                        { feature: utilDisplayLabel(entity, context.graph()) }) : '';
                },
                reference: selection => showReferenceEDTF(selection, parserError),
                entityIds: [entity.id],
                hash: key + entity.tags[key],
                dynamicFixes: function() {
                    var fixes = [];
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
                            }, t('issues.fix.remove_tag.annotation'));
                        }
                    }));
                    return fixes;
                }
            }));
        }
        validateEDTF('start_date', 'start');
        validateEDTF('end_date', 'end');

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

        function isFixableURL(url) {
            try {
                // must be a valid URL after adding a protocol
                const link = new URL(`https://${url}`);
                // should contain at least something that looks like a TLD
                return link.hostname.includes('.');
            } catch {
                return false;
            }
        }

        function cleanWikimediaCommonsReference(value, allTags) {
            if (!value) return null;
            if (allTags.wikimedia_commons) return null;
            for (const prefix of ['file', 'datei', 'fichier', 'plik']) {
                if (!value.toLowerCase().startsWith(prefix + ':')) continue;
                return 'File' + value.slice(prefix.length);
            }
            if (value.startsWith('Category:')) {
                return value;
            }
            return null;
        }

        function showReferenceWebsite(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.website.reference'));
        }

        const createWebsiteValidationIssueBase = keyOrField => ({
            type: type,
            subtype: 'website',
            severity: 'warning',
            message: function(context) {
                const entity = context.hasEntity(this.entityIds[0]);
                return entity ? t.append('issues.invalid_format.website.message' + (this.data?.count > 1 ? '_multi' : ''), {
                    feature: utilDisplayLabel(entity, context.graph()), site: this.data?.value,
                    where: typeof keyOrField === 'string'
                        ? selection => selection.append('code').text(keyOrField)
                        : keyOrField.label()
                }) : '';
            },
            dynamicFixes: function(context) {
                if (this.data?.count > 1) return [];
                if (!this.data?.isFixable) return [];
                return [{ protocol: 'https', icon: 'temaki-lock' }, { protocol: 'http' }]
                    .filter(fix => isValidURL(fix.protocol + '://' + this.data?.value, true))
                    .map(fix => new validationIssueFix({
                        icon: fix.icon,
                        title: t.append('issues.fix.add_protocol_'+ fix.protocol +'.title'),
                        onClick: function() {
                            const entityID = this.issue.entityIds[0];
                            const entity = context.entity(entityID);
                            if (!entity) return;
                            const key = this.issue.data.key;
                            const tags = Object.assign({}, entity.tags);
                            tags[key] = this.issue.data.fix.replace('{protocol}', fix.protocol);

                            context.perform(
                                actionChangeTags(entityID, tags),
                                t('issues.fix.add_protocol_'+ fix.protocol +'.annotation')
                            );
                        }
                    }));
            },
            entityIds: [entity.id]
        });

        function websiteReferenceWithDiff(oldTags, newTags) {
            return selection => showTagDiffReference(
                selection,
                showReferenceWebsite,
                utilTagDiff(oldTags, newTags)
            );
        }

        Object.entries(entity.tags).map(function([key, value]) {
            if (!osmUrlKeys.has(key)) return false;
            if (!value?.trim()) return false;
            if (key === 'image' && cleanWikimediaCommonsReference(value, entity.tags)) {
                // wikimedia commons tags are handled separately below
                return false;
            }
            const invalidParts = value.split(';')
                .map(s => s.trim())
                .filter(x => !isValidURL(x));
            if (invalidParts.length === 0) return false;
            const isFixable = invalidParts.some(isFixableURL);
            const fix = value
                .split(';')
                .map(s => s.trim())
                .map(s => isValidURL(s) || !isFixableURL(s) ? s : `{protocol}://${s}`)
                .join(';');
            const graph = context.graph();
            const entityExtent = entity.extent(graph);
            const preset = presetManager.match(entity, graph);
            const allFields = [
                ...preset.fields(entityExtent.center()),
                ...preset.moreFields(entityExtent.center()),
                ...presetManager.universal()
            ];
            let keyOrField = allFields.find(f => f.key === key || f.keys?.includes(key)) || key;
            return {
                ...createWebsiteValidationIssueBase(keyOrField),
                data: {
                    key,
                    isFixable,
                    fix,
                    count: invalidParts.length,
                },
                hash: key + '=' + invalidParts.join(';'),
                reference: isFixable
                    ? websiteReferenceWithDiff(entity.tags, {...entity.tags, [key]: fix.replace('{protocol}', 'https') })
                    : showReferenceWebsite
            };
        }).filter(Boolean)
        .forEach(issueData => issues.push(new validationIssue(issueData)));

        const wikimediaCommonsValidationIssueBase = {
            type: type,
            subtype: 'wikimedia_commons',
            message: function(context) {
                const entity = context.hasEntity(this.entityIds[0]);
                return entity ? t.append('issues.invalid_format.wikimedia_commons.message',
                    { feature: utilDisplayLabel(entity, context.graph()), site: this.data?.value }) : '';
            },
            entityIds: [entity.id]
        };

        if (entity.tags.image) {
            const value = entity.tags.image;
            const fix = cleanWikimediaCommonsReference(value, entity.tags);
            if (fix) {
                issues.push(new validationIssue({
                    ...wikimediaCommonsValidationIssueBase,
                    severity: 'suggestion',
                    data: { key: 'image', fix },
                    hash: 'image=' + value,
                    dynamicFixes: function(context) {
                        const wikimedia_commons_reference = this.data?.fix;
                        return [new validationIssueFix({
                            title: t.append('issues.fix.move_value_to_wikimedia_commons.title'),
                            onClick: function() {
                                const entityID = this.issue.entityIds[0];
                                const entity = context.entity(entityID);
                                if (!entity) return;
                                const key = this.issue.data.key;
                                const tags = Object.assign({}, entity.tags);
                                tags.wikimedia_commons = wikimedia_commons_reference;
                                delete tags[key];

                                context.perform(
                                    actionChangeTags(entityID, tags),
                                    t('issues.fix.move_value_to_wikimedia_commons.annotation')
                                );
                            }
                        })];
                    },
                    reference: selection => showTagDiffReference(
                        selection,
                        t.append('issues.invalid_format.wikimedia_commons.reference.wrong_key'),
                        utilTagDiff(entity.tags, { ...entity.tags, image: undefined, wikimedia_commons: fix })
                    )
                }));
            }
        }

        if (entity.tags.wikimedia_commons) {
            const value = entity.tags.wikimedia_commons;
            if (isValidURL(value, true)) {
                // wikimedia_commons should not contain a valid URL, see
                // https://wiki.openstreetmap.org/w/index.php?title=Key:wikimedia_commons&oldid=2959709#Common_tagging_mistakes
                const regex = /\/wiki\/(File|Category)(:|%3A)(.*)/;
                const url = new URL(value);
                const path = url.pathname;
                if (url.host === 'commons.wikimedia.org' && regex.test(path)) {
                    const parts = path.match(regex);
                    const newValue = decodeURIComponent(`${parts[1]}:${parts[3]}`).replace(/_/g, ' ');
                    const previewDiff = utilTagDiff({ wikimedia_commons: value }, { wikimedia_commons: newValue });
                    issues.push(new validationIssue({
                        ...wikimediaCommonsValidationIssueBase,
                        severity: 'warning',
                        data: {},
                        hash: 'wikimedia_commons=' + value,
                        dynamicFixes: function(context) {
                            return [new validationIssueFix({
                                title: t.append('issues.fix.upgrade_tags.title'),
                                onClick: function() {
                                    const entityID = this.issue.entityIds[0];
                                    const entity = context.entity(entityID);
                                    if (!entity) return;
                                    const tags = Object.assign({}, entity.tags);
                                    tags.wikimedia_commons = newValue;

                                    context.perform(
                                        actionChangeTags(entityID, tags),
                                        t('issues.fix.upgrade_tags.annotation')
                                    );
                                }
                            })];
                        },
                        reference: selection => showTagDiffReference(
                            selection,
                            t.append('issues.invalid_format.wikimedia_commons.reference.wrong_value'),
                            previewDiff
                        ),
                    }));
                }
            }
        }

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
                        return entity ? t.append('issues.invalid_format.email.message' + this.data, {
                            feature: utilDisplayLabel(entity, context.graph()), email: emails.join(', ')
                        }) : '';
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
