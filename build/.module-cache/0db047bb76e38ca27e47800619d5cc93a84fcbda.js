/** @jsx React.DOM */
'use strict';

var range = require('lodash.range'),
  React = require('react');


var YAxis = React.createClass({displayName: 'YAxis',
  propTypes: {
    height: React.PropTypes.number.isRequired,
    label: React.PropTypes.string,
    labelFontSize: React.PropTypes.number.isRequired,
    maxValue: React.PropTypes.number.isRequired,
    nbSteps: React.PropTypes.number.isRequired,
    strokeColor: React.PropTypes.string.isRequired,
    tickFontSize: React.PropTypes.number.isRequired,
    tickSize: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
  },
  getDefaultProps: function() {
    return {
      labelFontSize: 14,
      nbSteps: 10,
      strokeColor: 'black',
      tickFontSize: 12,
      tickSize: 6,
    };
  },
  render: function() {
    var stepSize = this.props.maxValue / this.props.nbSteps;
    var stepSizePx = this.valueToPixel(stepSize);
    var steps = range(0, this.props.maxValue + stepSize, stepSize);
    var lineStyle = {stroke: this.props.strokeColor, shapeRendering: 'crispedges'};
    return (
      React.DOM.g({className: "axis y-axis"}, 
        React.DOM.line({style: lineStyle, x2: 0, y2: this.props.height}), 
        
          steps.map(function(value, idx) {
            var translateY = this.props.height - idx * stepSizePx;
            return (
              React.DOM.g({key: 'tick-' + idx, transform: 'translate(0, ' + translateY + ')'}, 
                React.DOM.text({
                  style: {textAnchor: 'end', fontSize: this.props.tickFontSize}, 
                  x: - this.props.tickSize * 1.66, 
                  y: this.props.tickFontSize * 0.4}, 
                  value
                ), 
                React.DOM.line({style: lineStyle, x2: - this.props.tickSize, y2: 0})
              )
            );
          }, this), 
        
        
          this.props.label && (
            React.DOM.text({
              className: "axis-label", 
              style: {textAnchor: 'middle', fontSize: this.props.labelFontSize}, 
              transform: "rotate(-90)", 
              x: - (this.props.height / 2), 
              y: - this.props.width + this.props.labelFontSize}, 
              this.props.label
            )
          )
        
      )
    );
  },
  valueToPixel: function(value) {
    return (value / this.props.maxValue) * this.props.height;
  },
});

module.exports = YAxis;
