/** @jsx React.DOM */
'use strict';

var Lazy = require('lazy.js'),
  React = require('react/addons');


var VGrid = React.createClass({displayName: 'VGrid',
  propTypes: {
    height: React.PropTypes.number.isRequired,
    stepsPositions: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
    style: React.PropTypes.object,
  },
  getDefaultProps: function() {
    return {
      defaultStyle: {
        shapeRendering: 'crispedges',
        stroke: '#e5e5e5',
      },
    };
  },
  render: function() {
    var style = this.props.style ?
      Lazy(this.props.style).defaults(this.props.defaultStyle).toObject() :
      this.props.defaultStyle;
    return (
      React.DOM.g({className: "grid v-grid"}, 
        
          this.props.stepsPositions.map(function(stepPosition, idx) {
            return (
              React.DOM.g({key: 'line-' + idx, transform: 'translate(' + stepPosition + ', 0)'}, 
                React.DOM.line({style: style, y2: this.props.height})
              )
            );
          }, this)
        
      )
    );
  },
});

module.exports = VGrid;
