angular.module('gi.commerce').directive 'giCustomerForm'
, ['$q', 'giCurrency', 'giCart', 'giUtil'
, ($q, Currency, Cart, Util) ->
  restrict: 'E'
  scope:
    model: '='
    item: '='
    submitText: '@'
    stage: '@'
  templateUrl: 'gi.commerce.customerForm.html'
  link: ($scope, elem, attrs) ->
    $scope.emailRegex = Util.emailRegex
    $scope.lastNameRegex = /(^[a-zA-Z]{2,}$)/
    $scope.cart = Cart
    $scope.cart.paymentType = $scope.cart.getPaymentType()
    if not $scope.item?
      $scope.item = {}
    $scope.requestLogin = () ->
      $scope.$emit 'event:show-login'

    fieldUsed = (prop) ->
      $scope.customerForm[prop].$dirty and
      $scope.customerForm[prop].$touched

    $scope.isPropertyValidationError = (prop, needsMessage) ->
      errorMessage = ''
      isInvalid =
        fieldUsed(prop) and
        $scope.customerForm[prop].$invalid

      if isInvalid
        if prop is 'lastName'
          if $scope.customerForm[prop].$viewValue and ($scope.customerForm[prop].$viewValue).includes(' ')
            errorMessage = 'Field must not include spaces.'
          else
            errorMessage = 'Field must be at least 2 latin letters without numbers.'
        else
          errorMessage = "Field isn't not filled correctly."
      if needsMessage
        errorMessage
      else
        isInvalid

    $scope.isPropertyValidationSuccess = (prop) ->
      fieldUsed(prop) and
      $scope.customerForm[prop].$valid and
      $scope.customerForm[prop].$viewValue isnt ""

    $scope.isConfirmPasswordSuccess = (prop) ->
      $scope.isPropertyValidationSuccess(prop) and
      $scope.isPropertyValidationSuccess('password')

    $scope.isUsernameTaken = () ->
      fieldUsed('email') and
      (not $scope.customerForm.email.$error.email) and
      (not $scope.customerForm.email.$error.pattern) and
      $scope.customerForm.email.$error.giUsername

    $scope.isEmailInvalid = () ->
      fieldUsed('email') and
      ( $scope.customerForm.email.$error.email or
      $scope.customerForm.email.$error.pattern)

    $scope.$watch 'customerForm.$valid', (valid) ->
      $scope.cart.setStageValidity($scope.stage, valid)

    $scope.$watch 'customerForm.$pending', (pending) ->
      if pending?
        $scope.cart.setStageValidity($scope.stage, false)

    $scope.$watch 'cart.business', (business) ->
      if !business
        $scope.cart.setPaymentType(1)
        $scope.cart.paymentType = $scope.cart.getPaymentType()
]
