describe('iD.validations.missing_start_date', function () {
    var context;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
    });

    function createWay(tags) {
        var n1 = new iD.osmNode({id: 'n-1', loc: [4,4]});
        var n2 = new iD.osmNode({id: 'n-2', loc: [4,5]});
        var n3 = new iD.osmNode({id: 'n-3', loc: [5,5]});
        var w = new iD.osmWay({id: 'w-1', nodes: ['n-1', 'n-2', 'n-3'], tags: tags});

        context.perform(
            iD.actionAddEntity(n1),
            iD.actionAddEntity(n2),
            iD.actionAddEntity(n3),
            iD.actionAddEntity(w)
        );
    }

    function validate() {
        var validator = iD.validationMissingStartDate(context);
        var changes = context.history().changes();
        var entities = changes.modified.concat(changes.created);
        var issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    it('has only missing tag errors on init', function() {
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with no tags', function() {
        createWay({});
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with start_date tag', function() {
        createWay({ start_date: '1950' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with start_date:edtf tag', function() {
        createWay({ 'start_date:edtf': '1950' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with natural tag', function() {
        createWay({ natural: 'wood' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with waterway tag', function() {
        createWay({ waterway: 'river' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with water tag', function() {
        createWay({ water: 'pond' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('flags way without start_date tag', function() {
        createWay({ amenity: 'cafe' });
        var issues = validate();
        expect(issues).to.have.lengthOf(1);
    });

});
