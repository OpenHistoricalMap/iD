describe('iD.uiSourceSubfield', function() {
  let entity, context, selection, field;

  beforeEach(function() {
        entity = iD.osmNode({id: 'n12345'});
        context = iD.coreContext().assetPath('../dist/').init();
        context.history().merge([entity]);
        selection = d3.select(document.createElement('div'));
        field = iD.presetField('name', { key: 'name', type: 'text' });
    });

    it('adds an source subfield when the @ button is clicked',  () => new Promise(done => {
        var uiField = iD.uiField(context, field, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {   // async, so data will be available
            selection.call(uiField.render);
            happen.click(selection.selectAll('.source-icon').node());
            expect(selection.selectAll('.field-source').nodes().length).to.equal(1);
            done();
        }, 20);
    }));

    it('creates field:source tag after setting the value',  () => new Promise(done => {
        var uiField = iD.uiField(context, field, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {  // async, so data will be available
            selection.call(uiField.render);
            happen.click(selection.selectAll('.source-icon').node());

            iD.utilGetSetValue(selection.selectAll('.field-source-value'), 'Book 1');

            uiField.on('change', function(tags) {
            expect(tags).to.eql({'name:source': 'Book 1'});
        });
            happen.once(selection.selectAll('.field-source-value').node(), {type: 'change'});
            done();
        }, 20);
    }));


    it('removes the tag when the value is emptied',  () => new Promise(done => {
        var uiField = iD.uiField(context, field, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {   // async, so data will be available
            selection.call(uiField.render);
            happen.click(selection.selectAll('.source-icon').node());
            iD.utilGetSetValue(selection.selectAll('.field-source-value'), 'abc');

            uiField.on('change', function(tags) {
                expect(tags).to.eql({'name:source': undefined});
            });

            iD.utilGetSetValue(selection.selectAll('.field-source-value'), '');
            happen.once(selection.selectAll('.field-source-value').node(), {type: 'change'});
            done();
        }, 20);
    }));

    it('there is no @ button on main source field', function(done) {
        var uiField = iD.uiField(context, {...field, source: false}, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {   // async, so data will be available
            selection.call(uiField.render);
            expect(selection.selectAll('.source-icon').nodes().length).to.equal(0);
            done();
        }, 20);
    });
});
