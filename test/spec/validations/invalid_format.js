describe('iD.validations.invalid_format', function () {
    var context;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
    });

    function createPointWithTags(tags) {
        var n = iD.osmNode({id: 'n-1', loc: [4,4], tags: tags});
        context.perform(iD.actionAddEntity(n));
        return n;
    }

    function validate() {
        var validator = iD.validationFormatting(context);
        var changes = context.history().changes();
        var entities = changes.modified.concat(changes.created);
        var issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    describe('URL validation', function() {
        it('should not flag valid URLs', function() {
            var entity = createPointWithTags({
                website: 'https://example.com',
                'contact:website': 'http://test.org',
                url: 'https://www.valid-site.net/path?query=1'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(0);
        });

        it('should flag URLs missing scheme', function() {
            var entity = createPointWithTags({
                website: 'example.com'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(1);
            expect(issues[0].type).to.eql('invalid_format');
            expect(issues[0].subtype).to.eql('website');
        });

        it('should flag malformed URLs', function() {
            var entity = createPointWithTags({
                website: 'not-a-url',
                url: 'invalid://bad url with spaces'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(2);
            issues.forEach(function(issue) {
                expect(issue.type).to.eql('invalid_format');
                expect(issue.subtype).to.eql('website');
            });
        });

        it('should handle multiple URLs separated by semicolons', function() {
            var entity = createPointWithTags({
                website: 'https://example.com;invalid-url;http://valid.org'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(1);
            expect(issues[0].type).to.eql('invalid_format');
            expect(issues[0].subtype).to.eql('website');
            expect(issues[0].data.count).to.eql(1);
        });

        it('should handle multiple invalid URLs', function() {
            var entity = createPointWithTags({
                website: 'bad-url1;bad-url2'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(1);
            expect(issues[0].type).to.eql('invalid_format');
            expect(issues[0].subtype).to.eql('website');
            expect(issues[0].data.count).to.eql(2);
        });

        it('should validate all URL tags', function() {
            var entity = createPointWithTags({
                website: 'bad-url',
                url: 'another-bad-url',
                'contact:website': 'yet-another-bad',
                'source:url': 'still-bad'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(4);
            issues.forEach(function(issue) {
                expect(issue.type).to.eql('invalid_format');
                expect(issue.subtype).to.eql('website');
            });
        });

        it('should not flag empty URL fields', function() {
            var entity = createPointWithTags({
                website: '',
                url: undefined
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(0);
        });

        it('should suggest moving image URLs to Wikimedia Commons', function() {
            const entity = createPointWithTags({
                image: 'File:OpenStreetMap-Editor iD Logo.svg'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(1);
            expect(issues[0].type).to.eql('invalid_format');
            expect(issues[0].subtype).to.eql('website');
            const fixes = issues[0].dynamicFixes();
            expect(fixes).to.have.lengthOf(1);
            issues[0].fixes(context)[0].onClick(context);
            const fixedEntity = context.entity(entity.id);
            expect(fixedEntity.tags.image).to.be.undefined;
            expect(fixedEntity.tags.wikimedia_commons).to.eql(entity.tags.image);

        });
    });

    describe('Email validation', function() {
        it('should not flag valid emails', function() {
            var entity = createPointWithTags({
                email: 'test@example.com'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(0);
        });

        it('should flag invalid emails', function() {
            var entity = createPointWithTags({
                email: 'not-an-email'
            });
            var issues = validate(entity);
            expect(issues).to.have.lengthOf(1);
            expect(issues[0].type).to.eql('invalid_format');
            expect(issues[0].subtype).to.eql('email');
        });
    });

    // Cleanup after here?

        function createNode(tags) {
        let n = iD.osmNode({id: 'n-1', loc: [4,4], tags: tags});

        context.perform(
            iD.actionAddEntity(n)
        );
    }

    it('has no errors on init', function() {
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with no EDTF tag', function() {
        createNode({ natural: 'tree', name: 'Arbre du Ténéré', start_date: '1673', end_date: '1973' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with okay EDTF tag', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', 'start_date:edtf': '1550~/1900~', end_date: '1942' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('flags way with invalid EDTF tag', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', 'start_date:edtf': '155X~/1900~', end_date: '1942' });
        var issues = validate();
        expect(issues).to.have.lengthOf(1);
        var issue = issues[0];
        expect(issue.type).to.eql('invalid_format');
        expect(issue.entityIds).to.have.lengthOf(1);
        expect(issue.entityIds[0]).to.eql('n-1');
    });

    it('flags way with OSM-style date tag', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', 'start_date': 'before C20', end_date: '1942' });
        var issues = validate();
        expect(issues).to.have.lengthOf(1);
        var issue = issues[0];
        expect(issue.type).to.eql('invalid_format');
        expect(issue.entityIds).to.have.lengthOf(1);
        expect(issue.entityIds[0]).to.eql('n-1');
    });

});
