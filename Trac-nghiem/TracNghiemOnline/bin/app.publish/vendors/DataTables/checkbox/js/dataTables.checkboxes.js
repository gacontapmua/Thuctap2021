/*! Checkboxes 1.0.3
 *  Copyright (c) Gyrocode (www.gyrocode.com)
 *  License: MIT License
 */

/**
 * @summary     Checkboxes
 * @description Checkboxes extension for jQuery DataTables
 * @version     1.0.3
 * @file        dataTables.checkboxes.js
 * @author      Gyrocode (http://www.gyrocode.com/projects/jquery-datatables-checkboxes/)
 * @contact     http://www.gyrocode.com/contacts
 * @copyright   Copyright (c) Gyrocode
 * @license     MIT License
 */

(function(window, document, undefined) {


var factory = function( $, DataTable ) {
"use strict";

/**
 * Checkboxes is an extension for the jQuery DataTables library that provides
 * universal solution for working with checkboxes in a table.
 *
 *  @class
 *  @param {object} settings DataTables settings object for the host table
 *  @requires jQuery 1.7+
 *  @requires DataTables 1.10.0+
 *
 *  @example
 *     $('#example').DataTable({
 *        'columnDefs': [
 *           {
 *              'targets': 0,
 *              'checkboxes': true
 *           }
 *        ]
 *     });
 */
var Checkboxes = function ( settings ) {
   // Sanity check that we are using DataTables 1.10 or newer
   if ( ! DataTable.versionCheck || ! DataTable.versionCheck( '1.10.0' ) ) {
      throw 'DataTables Checkboxes requires DataTables 1.10.0 or newer';
   }

   this.s = {
      dt: new DataTable.Api( settings ),
      columns: [],
      data: {},
      ignoreSelect: false
   };

   // Check if checkboxes have already been initialised on this table
   if ( this.s.dt.settings()[0].checkboxes ) {
      return;
   }

   settings.checkboxes = this;

   this._constructor();
};


Checkboxes.prototype = {
   /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    * Constructor
    */

   /**
    * Initialise the Checkboxes instance
    *
    * @private
    */
   _constructor: function ()
   {
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      for(var i = 0; i < ctx.aoColumns.length; i++){
         if (ctx.aoColumns[i].checkboxes){
            //
            // INITIALIZATION
            //

            if(!$.isPlainObject(ctx.aoColumns[i].checkboxes)){
               ctx.aoColumns[i].checkboxes = {};
            }

            ctx.aoColumns[i].checkboxes = $.extend(
               {}, Checkboxes.defaults, ctx.aoColumns[i].checkboxes
            );


            //
            // WORKAROUNDS:
            //
            // DataTables doesn't support natively ability to modify settings on the fly.
            // The following code is a workaround that deals with possible consequences.

            DataTable.ext.internal._fnApplyColumnDefs(ctx, [{
                  'targets': i,
                  'searchable': false,
                  'orderable': false,
                  'width':'1%',
                  'className': 'dt-body-center',
                  'render': function (data, type, full, meta){
                     if(type === 'display'){
                        data = '<input type="checkbox">';
                     }
                     return data;
                  }
               }], {}, function (iCol, oDef) {
                  DataTable.ext.internal._fnColumnOptions( ctx, iCol, oDef );
            });

            // Remove "sorting" class
            $(dt.column(i).header())
               .removeClass('sorting');

            // Detach all event handlers for this column
            $(dt.column(i).header()).off('.dt');

            // Invalidate column data
            var cells = dt.cells('tr', i);
            cells.invalidate('data');

            // Add required class to existing cells
            $(cells.nodes()).addClass('dt-body-center');


            //
            // DATA
            //

            // Initialize array holding data for selected checkboxes
            self.s.data[i] = [];

            // Store column index for easy column selection later
            self.s.columns.push(i);


            //
            // CLASSES
            //

            if(ctx.aoColumns[i].checkboxes.selectRow){
               $(dt.table().node()).addClass('checkboxes-select');
            }

            if(ctx.aoColumns[i].checkboxes.selectAll){
               $(dt.column(i).header())
                  .html('<input type="checkbox">')
                  .addClass('checkboxes-select-all');
            }


            //
            // EVENT HANDLERS
            //
            var $table = $(dt.table().node());
            var $table_body = $(dt.table().body());
            var $table_header = $(dt.table().header());

            // Handles checkbox click event
            $table_body.on('click', 'input[type="checkbox"]', function(e){
               self.onClick(e, this);
            });

            // Handle row select/deselect event
            if(ctx.aoColumns[i].checkboxes.selectRow){
               // If Select extension is available
               if(DataTable.select){
                  // Handle row selection event
                  $table.on('select.dt deselect.dt', function(e, api, type, indexes){
                     self.onSelect(e, type, indexes);
                  });

                  // Disable Select extension information display
                  dt.select.info(false);

               // Otherwise, if Select extension is not available
               } else {
                  $table_body.on('click', 'td', function(){
                     var $row = $(this).closest('tr');
                     var e = {
                        type: ($row.hasClass('selected') ? 'deselect' : 'select')
                     };

                     self.onSelect(e, 'row', [dt.row($row).index()]);

                     $row.toggleClass('selected');

                     $table.trigger(e.type);
                  });
               }

               // Update the table information element with selected item summary
               $table.on('draw.dt select.dt deselect.dt', function (){
                  self.showInfoSelected();
               });
            }

            // Handle table draw event
            $table.on('draw.dt', function(e, ctx){
               self.onDraw(e, ctx);
            });

            // Handle click on "Select all" control
            $table_header.on('click', 'th.checkboxes-select-all input[type="checkbox"]', function(e){
               self.onClickSelectAll(e, this);
            });

            // Handle click on heading containing "Select all" control
            $table_header.on('click', 'th.checkboxes-select-all', function(e) {
               $('input[type="checkbox"]', this).trigger('click');
            });
         }
      }

      // WORKAROUND: Adjust column sizes and redraw table
      dt
         .columns.adjust()
         .draw(false);
   },

   // Updates array holding data for selected checkboxes
   updateData: function(type, selector, isSelected){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      var nodes = [];
      if(type === 'row'){
         dt.rows(selector).every(function(rowIdx){
            for(var colIdx = 0; colIdx < ctx.aoColumns.length; colIdx++){
               // If Checkboxes extension is enabled
               // and row selection is enabled for this column
               if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectRow){
                  nodes.push(dt.cell(rowIdx, colIdx).node());
               }
            }
         });

      } else if(type === 'cell'){
         nodes = dt.cells(selector).nodes();

         dt.cells(nodes).every(function () {
            var colIdx = this.index().column;
            var rowIdx = this.index().row;

            // If Checkboxes extension is enabled
            // and row selection is enabled for this column
            if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectRow){
               // Get list of columns other than this cell's column
               // where Checkboxes extension is enabled
               var columns = $.grep(self.s.columns, function(value){ return value != colIdx; });

               // Add cells from other columns
               $.merge(nodes, dt.cells(rowIdx, columns).nodes());
            }
         });
      }

      if(nodes.length){
         dt.cells(nodes).every(function () {
            var cellCol = this.index().column;

            // If Checkboxes extension is enabled for this column
            if(ctx.aoColumns[cellCol].checkboxes){
               // Get cell data
               var cellData = this.data();

               // Determine whether data is in the list
               var index = $.inArray(cellData, ctx.checkboxes.s.data[cellCol]);

               // If checkbox is checked and data is not in the list
               if(isSelected && index === -1){
                  ctx.checkboxes.s.data[cellCol].push(cellData);

               // Otherwise, if checkbox is not checked and data is in the list
               } else if (!isSelected && index !== -1){
                  ctx.checkboxes.s.data[cellCol].splice(index, 1);
               }
            }
         });
      }
   },

   // Updates row selection
   updateSelect: function(type, selector, isSelected){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      var nodes = [];
      if(type === 'row'){
         nodes = dt.rows(selector).nodes();

      } else if(type === 'cell'){
         dt.cells(selector).every(function () {
            var colIdx = this.index().column;
            var rowIdx = this.index().row;

            // If Checkboxes extension is enabled
            // and row selection is enabled for this column
            if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectRow){
               nodes.push(dt.$(this.node()).closest('tr').get(0));
            }
         });
      }
      
      if(nodes.length){
         // If Select extension is available
         if(DataTable.select){
            // Disable select event hanlder temporarily
            self.s.ignoreSelect = true;

            if(isSelected){
               dt.rows(nodes).select();
            } else {
               dt.rows(nodes).deselect();
            }

            // Re-enable select event handler
            self.s.ignoreSelect = false;

         // Otherwise, if Select extension is not available
         } else {
            if(isSelected){
               dt.$(nodes).addClass('selected');
            } else {
               dt.$(nodes).removeClass('selected');
            }
         }
      }
   },

   // Updates row selection
   updateCheckbox: function(type, selector, isSelected){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      var nodes = [];
      if(type === 'row'){
         dt.rows(selector).every(function(rowIdx){
            for(var colIdx = 0; colIdx < ctx.aoColumns.length; colIdx++){
               if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectRow){
                  nodes.push(dt.cell(rowIdx, colIdx).node());
               }
            }
         });

      } else if(type === 'cell'){
         nodes = dt.cells(selector).nodes();

         dt.cells(nodes).every(function(){
            var colIdx = this.index().column;
            var rowIdx = this.index().row;

            // If Checkboxes extension is enabled
            // and row selection is enabled for this column
            if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectRow){
               // Get list of columns other than this cell's column
               // where Checkboxes extension is enabled
               var columns = $.grep(self.s.columns, function(value){ return value != colIdx; });

               // Add cells from other columns
               $.merge(nodes, dt.cells(rowIdx, columns).nodes());
            }
         });
      }


      if(nodes.length){
         dt.$(nodes).find('input[type="checkbox"]').prop('checked', isSelected);
      }
   },


   // Handles checkbox click event
   onClick: function(e, ctrl){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      // Get cell
      var $cell = $(ctrl).closest('td');
      var cell = dt.cell($cell);

      // REPLACE: dt.cells($cell).checkbox.select()

      // Get cell's column index
      var cellCol = cell.index().column;

      // Get cell data
      var cellData = cell.data();

      // If Checkboxes extension is enabled for this column
      if(ctx.aoColumns[cellCol].checkboxes){
         self.updateCheckbox('cell', $cell, ctrl.checked);
         self.updateData('cell', $cell, ctrl.checked);
         self.updateSelect('cell', $cell, ctrl.checked);
         self.updateSelectAll();

         // Prevent click event from propagating to parent
         e.stopPropagation();
      }
   },

   // Handles row select/deselect event
   onSelect: function(e, type, indexes){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      if(self.s.ignoreSelect){ return; }

      if(type === 'row'){
         self.updateCheckbox('row', indexes, (e.type === 'select') ? true : false);
         self.updateData('row', indexes, (e.type === 'select') ? true : false);
         self.updateSelectAll();
      }
   },

   // Handles checkbox click event
   onClickSelectAll: function(e, ctrl){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      // Calculate column index
      var col = dt.column($(ctrl).closest('th')).index();

      var cells = dt.cells('tr', col, {
         page: (
            (ctx.aoColumns[col].checkboxes && ctx.aoColumns[col].checkboxes.selectAllPages)
            ? 'all'
            : 'current'
         ),
         search: 'applied'
      });

      self.updateData('cell', cells.nodes(), ctrl.checked);
      self.updateCheckbox('cell', cells.nodes(), ctrl.checked);

      // If row selection is enabled
      if(ctx.aoColumns[col].checkboxes.selectRow){
         var rows = dt.rows({
            page: (
               (ctx.aoColumns[col].checkboxes && ctx.aoColumns[col].checkboxes.selectAllPages)
                  ? 'all'
                  : 'current'
            ),
            search: 'applied'
         });

         self.updateSelect('row', rows.nodes(), ctrl.checked);
      }

      self.updateSelectAll();

      e.stopPropagation();
   },

   // Handles table draw event
   onDraw: function(e, ctx){
      var self = this;
      var dt = self.s.dt;
      ctx = dt.settings()[0];

      var rows_seen = {};
      // Enumerate all cells
      dt.cells('tr', self.s.columns, { page: 'current', search: 'applied' }).every(function(){
         var cellColIdx = this.index().column;
         var cellRowIdx = this.index().row;

         // Get cell data
         var cellData = this.data();

         // Determine whether data is in the list
         var index = $.inArray(cellData, ctx.checkboxes.s.data[cellColIdx]);

         // If data is in the list
         if(index !== -1){
            // If this row hasn't been processed yet
            if(!rows_seen.hasOwnProperty(cellRowIdx)){
               self.updateCheckbox('cell', this.node(), true);
               self.updateSelect('cell', this.node(), true);

               if(ctx.aoColumns[cellColIdx].checkboxes && ctx.aoColumns[cellColIdx].checkboxes.selectRow){
                  // Mark row as processed
                  rows_seen[cellRowIdx] = true;
               }
            }
         }
      });

      self.updateSelectAll();
   },

   // Updates state of the "Select all" controls
   updateSelectAll: function(){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      for(var colIdx = 0; colIdx < ctx.aoColumns.length; colIdx++){
         // If Checkboxes extension is enabled for this column
         // and "Select all" control is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectAll){
            var cells = dt.cells('tr', colIdx, {
               page: (
                  (ctx.aoColumns[colIdx].checkboxes.selectAllPages)
                  ? 'all'
                  : 'current'
               ),
               search: 'applied'
            });

            var $table = dt.table().container();
            var $chkbox_all = dt.$(cells.nodes()).find('input[type="checkbox"]');
            var $chkbox_checked = dt.$(cells.nodes()).find('input[type="checkbox"]:checked');
            var chkbox_select_all = $('input[type="checkbox"]', dt.column(colIdx).header()).get(0);

            // If none of the checkboxes are checked
            if ($chkbox_checked.length === 0) {
               chkbox_select_all.checked = false;
               if ('indeterminate' in chkbox_select_all) {
                  chkbox_select_all.indeterminate = false;
               }

            // If all of the checkboxes are checked
            } else if ($chkbox_checked.length === $chkbox_all.length) {
               chkbox_select_all.checked = true;
               if ('indeterminate' in chkbox_select_all) {
                  chkbox_select_all.indeterminate = false;
               }

            // If some of the checkboxes are checked
            } else {
               chkbox_select_all.checked = true;
               if ('indeterminate' in chkbox_select_all) {
                  chkbox_select_all.indeterminate = true;
               }
            }
         }
      }
   },

   // Updates the information element of the DataTable showing information about the
   // items selected. Based on info() method of Select extension.
   showInfoSelected: function(){
      var self = this;
      var dt = self.s.dt;
      var ctx = dt.settings()[0];

      if ( ! ctx.aanFeatures.i ) {
         return;
      }

      var $output  = $('<span class="select-info"/>');
      var add = function(name, num){
         $output.append( $('<span class="select-item"/>').append( dt.i18n(
            'select.'+name+'s',
            { _: '%d '+name+'s selected', 0: '', 1: '1 '+name+' selected' },
            num
         ) ) );
      };

      // Find index of the first column that has checkbox and row selection enabled
      var colSelectRowIdx = -1;
      for(var colIdx = 0; colIdx < ctx.aoColumns.length; colIdx++){
         // If Checkboxes extension is enabled
         // and row selection is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectRow){
            colSelectRowIdx = colIdx;
            break;
         }
      }

      // If there is a column that has checkbox and row selection enabled
      if(colSelectRowIdx !== -1){
         add('row', ctx.checkboxes.s.data[colSelectRowIdx].length);

         // Internal knowledge of DataTables to loop over all information elements
         $.each( ctx.aanFeatures.i, function ( i, el ) {
            var $el = $(el);

            var $exisiting = $el.children('span.select-info');
            if($exisiting.length){
               $exisiting.remove();
            }

            if($output.text() !== ''){
               $el.append($output);
            }
         });
      }
   }

};


/**
 * Checkboxes default settings for initialisation
 *
 * @namespace
 * @name Checkboxes.defaults
 * @static
 */
Checkboxes.defaults = {
   /**
    * Enable / disable row selection
    *
    * @type {Boolean}
    * @default  `false`
    */
   selectRow: false,

   /**
    * Enable / disable "select all" control in the header
    *
    * @type {Boolean}
    * @default  `true`
    */
   selectAll: true,

   /**
    * Enable / disable ability to select checkboxes from all pages
    *
    * @type {Boolean}
    * @default  `true`
    */
   selectAllPages: true
};


/*
 * API
 */
var Api = $.fn.dataTable.Api;

// Doesn't do anything - work around for a bug in DT... Not documented
Api.register( 'checkboxes()', function () {
   return this;
} );

Api.registerPlural( 'columns().checkboxes.select()', 'column().checkboxes.select()', function ( select ) {
   if(typeof select === 'undefined'){ select = true; }

   return this.iterator( 'column', function (ctx, colIdx){
      if(ctx.checkboxes){
         var selector = this.cells('tr', colIdx).nodes();
         ctx.checkboxes.updateCheckbox('cell', selector, (select) ? true : false);
         ctx.checkboxes.updateData('cell', selector, (select) ? true : false);
         ctx.checkboxes.updateSelect('cell', selector, (select) ? true : false);
         ctx.checkboxes.updateSelectAll();
      }
   }, 1 );
} );

Api.registerPlural( 'cells().checkboxes.select()', 'cell().checkboxes.select()', function ( select ) {
   if(typeof select === 'undefined'){ select = true; }

   return this.iterator( 'cell', function ( ctx, rowIdx, colIdx ) {
      if(ctx.checkboxes){
         var selector = { row: rowIdx, column: colIdx };
         ctx.checkboxes.updateCheckbox('cell', selector, (select) ? true : false);
         ctx.checkboxes.updateData('cell', selector, (select) ? true : false);
         ctx.checkboxes.updateSelect('cell', selector, (select) ? true : false);
         ctx.checkboxes.updateSelectAll();
      }
   }, 1 );
} );

Api.registerPlural( 'columns().checkboxes.deselect()', 'column().checkboxes.deselect()', function () {
   return this.checkboxes.select(false);
} );

Api.registerPlural( 'cells().checkboxes.deselect()', 'cell().checkboxes.deselect()', function () {
   return this.checkboxes.select(false);
} );

Api.registerPlural( 'columns().checkboxes.selected()', 'column().checkboxes.selected()', function () {
   return this.iterator( 'column', function (ctx, colIdx){
      if(ctx.aoColumns[colIdx].checkboxes){
         return ctx.checkboxes.s.data[colIdx];
      }
   }, 1 );
} );


/**
 * Version information
 *
 * @name Checkboxes.version
 * @static
 */
Checkboxes.version = '1.0.0';



$.fn.DataTable.Checkboxes = Checkboxes;
$.fn.dataTable.Checkboxes = Checkboxes;


// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
$(document).on( 'preInit.dt.dtr', function (e, settings, json) {
   if ( e.namespace !== 'dt' ) {
      return;
   }

   new Checkboxes( settings );
} );

return Checkboxes;
}; // /factory


// Define as an AMD module if possible
if ( typeof define === 'function' && define.amd ) {
   define( ['jquery', 'datatables'], factory );
}
else if ( typeof exports === 'object' ) {
    // Node/CommonJS
    factory( require('jquery'), require('datatables') );
}
else if ( jQuery && !jQuery.fn.dataTable.Checkboxes ) {
   // Otherwise simply initialise as normal, stopping multiple evaluation
   factory( jQuery, jQuery.fn.dataTable );
}


})(window, document);
