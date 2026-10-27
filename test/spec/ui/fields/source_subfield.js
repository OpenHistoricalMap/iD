import { select as d3_select } from 'd3-selection';

describe('iD.uiSourceSubfield', function() {
  let entity, context, selection, field;

  beforeEach(function() {
        entity = new iD.osmNode({id: 'n12345'});
        context = iD.coreContext().assetPath('../dist/').init();
        context.history().merge([entity]);
        selection = d3_select(document.createElement('div'));
        field = iD.presetField('name', { key: 'name', type: 'text' });
    });

    it('adds an source subfield when the @ button is clicked', () => new Promise(done => {
        var uiField = iD.uiField(context, field, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {   // async, so data will be available
            selection.call(uiField.render);
            selection.selectAll('.source-icon').node().dispatchEvent(new MouseEvent('click'));
            expect(selection.selectAll('.field-source').nodes().length).to.equal(1);
            done();
        }, 20);
    }));

    it('creates field:source tag after setting the value', () => new Promise(done => {
        var uiField = iD.uiField(context, field, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {  // async, so data will be available
            selection.call(uiField.render);
            selection.selectAll('.source-icon').node().dispatchEvent(new MouseEvent('click'));

            iD.utilGetSetValue(selection.selectAll('.field-source-value'), 'Book 1');

            uiField.on('change', function(tags) {
            expect(tags).to.eql({'name:source': 'Book 1'});
        });
            selection.selectAll('.field-source-value').node().dispatchEvent(new Event('change'));
            done();
        }, 20);
    }));


    it('removes the tag when the value is emptied', () => new Promise(done => {
        var uiField = iD.uiField(context, field, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {   // async, so data will be available
            selection.call(uiField.render);
            selection.selectAll('.source-icon').node().dispatchEvent(new MouseEvent('click'));
            iD.utilGetSetValue(selection.selectAll('.field-source-value'), 'abc');

            uiField.on('change', function(tags) {
                expect(tags).to.eql({'name:source': undefined});
            });

            iD.utilGetSetValue(selection.selectAll('.field-source-value'), '');
            selection.selectAll('.field-source-value').node().dispatchEvent(new Event('change'));
            done();
        }, 20);
    }));

    it('there is no @ button on main source field', () => new Promise(done => {
        var uiField = iD.uiField(context, {...field, source: false}, ['n12345'], {show: true, wrap: true});
        window.setTimeout(function() {   // async, so data will be available
            selection.call(uiField.render);
            expect(selection.selectAll('.source-icon').nodes().length).to.equal(0);
            done();
        }, 20);
    }));
});
