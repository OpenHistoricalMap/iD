describe('iD.validations.mismatched_dates', function () {
    let context;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
    });

    function createNode(tags) {
        let n = iD.osmNode({id: 'n-1', loc: [4,4], tags: tags});

        context.perform(
            iD.actionAddEntity(n)
        );
    }

    function validate() {
        let validator = iD.validationMismatchedDates(context);
        let changes = context.history().changes();
        let entities = changes.modified.concat(changes.created);
        let issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    it('has no errors on init', function() {
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with no EDTF tag', function() {
        createNode({ natural: 'tree', name: 'Arbre du Ténéré', start_date: '1673', end_date: '1973' });
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with date within EDTF range', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', start_date: '1900', 'start_date:edtf': '1550~/1900~', end_date: '1942' });
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with identical EDTF date', function() {
        createNode({ shop: 'mall', name: 'Forest Fair Mall', start_date: '1988-07-11', 'start_date:edtf': '1988-07-11', end_date: '2003-06-10', 'end_date:edtf': '2003-06-10' });
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('flags way with date outside of EDTF range', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', start_date: '1901', 'start_date:edtf': '1550~/1900~', end_date: '1942' });
        let issues = validate();
        expect(issues).to.have.lengthOf(1);
        let issue = issues[0];
        expect(issue.type).to.eql('mismatched_dates');
        expect(issue.entityIds).to.have.lengthOf(1);
        expect(issue.entityIds[0]).to.eql('n-1');
    });

    it('ignores way with date narrowed by EDTF time range', function() {
        createNode({ shop: 'mall', name: 'Forest Fair Mall', start_date: '1988-07-11', 'start_date:edtf': '1988-07-11T10:00', end_date: '2003-06-10', 'end_date:edtf': '2003-06-10T08:00/2003-06-10T21:00' });
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('flags way with date outside of EDTF time range', function() {
        createNode({ shop: 'mall', name: 'Forest Fair Mall', start_date: '1988-07-11', 'start_date:edtf': '1988-07-12', end_date: '2003-06-11', 'end_date:edtf': '2003-06-10T08:00/2003-06-10T21:00' });
        let issues = validate();
        expect(issues).to.have.lengthOf(2);
    });

    it('equates unknown date with unspecified date in EDTF extended interval', function() {
        let validator = iD.validationMismatchedDates(context);
        expect(validator.parseEDTF('/1234').toString()).to.equal(validator.parseEDTF('../1234').toString());
        expect(validator.parseEDTF('5678/').toString()).to.equal(validator.parseEDTF('5678/..').toString());
        expect(validator.parseEDTF('/').toString()).to.equal(validator.parseEDTF('../..').toString());
    });

    it('suggests replacing date with bounds of EDTF range', function() {
        let validator = iD.validationMismatchedDates(context);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/..'))).to.deep.equal(['1234']);
        expect(validator.getReplacementDates(validator.parseEDTF('../5678'))).to.deep.equal(['5678']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/5678'))).to.deep.equal(['1234', '5678']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234-10/5678'))).to.deep.equal(['1234-10', '5678']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/5678-10-11'))).to.deep.equal(['1234', '5678-10-11']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/5678-10-11T12:13:14'))).to.deep.equal(['1234', '5678-10-11']);
    });
});
