/** @jsx React.DOM */
'use strict';

var Lazy = require('lazy.js'),
  React = require('react');


var HGrid = React.createClass({displayName: 'HGrid',
  propTypes: {
    height: React.PropTypes.number.isRequired,
    nbSteps: React.PropTypes.number.isRequired,
    startStep: React.PropTypes.number.isRequired,
    style: React.PropTypes.object,
    width: React.PropTypes.number.isRequired,
  },
  getDefaultProps: function() {
    return {
      defaultStyle: {
        shapeRendering: 'crispedges',
        stroke: '#e5e5e5',
      },
      startStep: 0,
    };
  },
  render: function() {
    var style = Lazy(this.props.style).defaults(this.props.defaultStyle).toObject();
    var stepHeight = this.props.height / this.props.nbSteps;
    return (
      React.DOM.g({className: "grid h-grid"}, 
        
          Lazy.range(this.props.startStep, this.props.nbSteps + this.props.startStep).toArray().map(function(stepIdx) {
            var translateY = - stepIdx * stepHeight;
            return (
              React.DOM.g({key: 'line-' + stepIdx, transform: 'translate(0, ' + translateY + ')'}, 
                React.DOM.line({style: style, x2: this.props.width})
              )
            );
          }, this)
        
      )
    );
  },
});

module.exports = HGrid;
