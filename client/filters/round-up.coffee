angular.module('gi.commerce').filter 'roundUp'
, [ '$filter'
, () ->
  (number) ->
    return Math.ceil(number)
]
