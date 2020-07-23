angular.module('gi.security').directive 'couponValid'
, [ '$q', '$http', 'giCart'
, ($q, $http, Cart) ->
  restrict: 'A'
  require: 'ngModel'
  compile: (elem, attrs) ->
    linkFn = ($scope, elem, attrs, controller) ->

      controller.$asyncValidators.couponValid = (modelValue, viewValue) ->
        deferred = $q.defer()
        if (not viewValue?) or viewValue is ""
          deferred.resolve()
        else
          $http.get('/api/coupon-info?couponCode=' + viewValue).success (couponInfo) ->
            if couponInfo?
              console.log "couponInfo"
              console.dir couponInfo
            deferred.resolve couponInfo
          .error (err) ->
            deferred.reject err

        deferred.promise

    linkFn
]
