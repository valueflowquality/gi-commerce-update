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
          Cart.setDefaultCoupon()
          deferred.resolve()
        else
          assets = Cart.getItems()
          if !assets?.length > 0
            deferred.reject err
            return

          itemParams = ""

          for asset in assets
            if asset._data?._id
              itemParams += "&assets[]=" + asset._data._id

          $http.get('/api/coupon-info?couponCode=' + viewValue + itemParams).success (coupon) ->
            if coupon?.valid
              Cart.setCoupon(coupon)
              deferred.resolve coupon
            else
              Cart.setDefaultCoupon()
              deferred.reject()
          .error (err) ->
            Cart.setDefaultCoupon()
            deferred.reject err

        deferred.promise

    linkFn
]
