angular.module('gi.commerce', ['gi.util', 'gi.security']).value('version', '0.7.9').config([
  'giI18nProvider', function(I18nProvider) {
    var messages;
    messages = {
      US: [
        {
          key: 'gi-postal-area',
          value: 'state'
        }
      ],
      GB: [
        {
          key: 'gi-postal-area',
          value: 'county'
        }
      ],
      ROW: [
        {
          key: 'gi-postal-area',
          value: 'region'
        }
      ]
    };
    return angular.forEach(messages, function(messages, countryCode) {
      return I18nProvider.setMessagesForCountry(messages, countryCode);
    });
  }
]).run([
  '$rootScope', 'giCart', 'giCartItem', 'giLocalStorage', function($rootScope, giCart, giCartItem, store) {
    $rootScope.$on('giCart:change', function() {
      return giCart.save();
    });
    if (angular.isObject(store.get('cart'))) {
      return giCart.restore(store.get('cart'));
    } else {
      return giCart.init();
    }
  }
]);

angular.module('gi.commerce').filter('giCurrency', [
  '$filter', function($filter) {
    return function(amount, currencySymbol, fractionSize) {
      if (angular.isFunction(currencySymbol)) {
        currencySymbol = currencySymbol();
      }
      return $filter('currency')(amount, currencySymbol, fractionSize);
    };
  }
]);

angular.module('gi.commerce').filter('giCurrencyId', [
  'giCurrency', function(Currency) {
    return function(currencyId) {
      var cur, result;
      result = "N/A";
      if (currencyId != null) {
        cur = Currency.getCached(currencyId);
        if (cur != null) {
          result = cur.symbol + ' ' + cur.code;
        }
      }
      return result;
    };
  }
]);

angular.module('gi.commerce').filter('giMarketId', [
  'giMarket', function(Model) {
    return function(id) {
      var cur, result;
      result = "N/A";
      if (id != null) {
        cur = Model.getCached(id);
        if (cur != null) {
          result = cur.code;
        }
      }
      return result;
    };
  }
]);

var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

angular.module('gi.commerce').directive('giAddressFormFields', [
  'giCart', 'giI18n', 'giUtil', function(Cart, I18n, Util) {
    return {
      restrict: 'E',
      templateUrl: 'gi.commerce.addressFormFields.html',
      scope: {
        model: '=',
        item: '=',
        title: '@',
        prefix: '@',
        form: '=',
        stage: '@',
        options: '=',
        addresses: '=',
        selectaddress: '=',
        deleteAddress: '='
      },
      link: function($scope, elem, attrs) {
        $scope.cart = Cart;
        Cart.sendCart('Viewed Address Details');
        $scope.getStateMessage = function() {
          return I18n.getCapitalisedMessage('gi-postal-area');
        };
        if ($scope.item == null) {
          $scope.item = {};
        }
        $scope.checkValid = function(country) {
          if (country) {
            return $scope.validCountry = true;
          }
        };
        $scope.isPropertyValidationError = function(prop) {
          return $scope.form[prop].$invalid && $scope.form[prop].$touched && $scope.form[prop].$dirty;
        };
        $scope.isPropertyValidationSuccess = function(prop) {
          return $scope.form[prop].$valid && $scope.form[prop].$touched && $scope.form[prop].$dirty;
        };
        $scope.getCountrySorter = function() {
          var topCodes;
          topCodes = [];
          if ($scope.cart.getCountryCode()) {
            topCodes.push($scope.cart.getCountryCode());
          }
          if (!(indexOf.call(topCodes, "US") >= 0)) {
            topCodes.push("US");
          }
          if (!(indexOf.call(topCodes, "GB") >= 0)) {
            topCodes.push("GB");
          }
          return Util.countrySort(topCodes);
        };
        return $scope.updateAddress = function(selectedAddress) {
          return $scope.item = selectedAddress;
        };
      }
    };
  }
]);

angular.module('gi.commerce').directive('giAddToCart', [
  'giCart', function(giCart) {
    return {
      restrict: 'E',
      scope: {
        id: '@',
        name: '@',
        quantity: '@',
        price: '@',
        data: '='
      },
      transclude: true,
      templateUrl: 'gi.commerce.addtocart.html',
      link: function(scope, element, attrs) {
        scope.attrs = attrs;
        scope.addItem = function(item) {
          return giCart.addItem(item);
        };
        return scope.inCart = function() {
          return giCart.getItemById(attrs.id);
        };
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCcNum', [
  '$parse', 'giCard', function($parse, Card) {
    return {
      restrict: 'A',
      require: 'ngModel',
      compile: function(elem, attrs) {
        var card, linkFn;
        attrs.$set('pattern', '[0-9]*');
        card = Card.card;
        linkFn = function($scope, elem, attrs, controller) {
          var $viewValue, ngModelController;
          ngModelController = controller;
          $scope.$watch(attrs.ngModel, function(number) {
            ngModelController.$giCcType = card.type(number);
          });
          $viewValue = function() {
            return ngModelController.$viewValue;
          };
          if (attrs.ccEagerType != null) {
            $scope.$watch($viewValue, function(number) {
              var res;
              if (number != null) {
                number = card.parse(number);
                res = card.type(number, true);
                ngModelController.$giCcEagerType = res;
              }
            });
          }
          $scope.$watch(attrs.giCcType, function(type) {
            ngModelController.$validate();
          });
          ngModelController.$parsers.unshift(function(number) {
            return card.parse(number);
          });
          ngModelController.$validators.giCcNumber = function(number) {
            var res;
            res = card.isValid(number);
            return (res != null) && res;
          };
          return ngModelController.$validators.giCcNumberType = function(number) {
            var res;
            res = card.isValid(number, $parse(attrs.giCcType)($scope));
            return (res != null) && res;
          };
        };
        return linkFn;
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCcExp', [
  '$parse', function($parse) {
    return {
      restrict: 'A',
      require: 'ngModel',
      compile: function(elem, attrs) {
        var linkFn;
        attrs.$set('pattern', '[0-9]*');
        linkFn = function($scope, elem, attrs, controller) {
          var $viewValue, ngModelController;
          ngModelController = controller;
          $viewValue = function() {
            return ngModelController.$viewValue;
          };
          return ngModelController.$validators.giCcExp = function(x) {
            var date, exp, givenExpiry, match;
            exp = /^(0[1-9]|1[0-2])\/?(?:20)?([0-9]{2})$/;
            match = exp.exec(x);
            if (match != null) {
              date = moment.utc();
              givenExpiry = moment.utc(match[1] + '-' + match[2], "MM-YY").endOf('Month');
              return date.isBefore(givenExpiry);
            } else {
              return false;
            }
          };
        };
        return linkFn;
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCcCvc', [
  '$parse', 'giCard', function($parse, Card) {
    return {
      restrict: 'A',
      require: 'ngModel',
      compile: function(elem, attrs) {
        var cvc, linkFn;
        attrs.$set('maxlength', 4);
        attrs.$set('pattern', '[0-9]*');
        cvc = Card.cvc;
        linkFn = function($scope, elem, attrs, controller) {
          controller.$validators.giCcCvc = function(value) {
            return cvc.isValid(value, $parse(attrs.giCcType)($scope));
          };
          return $scope.$watch(attrs.giCcType, function(x) {
            controller.$validate();
          });
        };
        return linkFn;
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCart', [
  'giCart', function(giCart) {
    return {
      restrict: 'E',
      scope: {
        stage: '@'
      },
      templateUrl: 'gi.commerce.cart.html',
      link: function($scope, element, attrs) {
        $scope.giCart = giCart;
        $scope.$watch('giCart.totalItems()', function(numItems) {
          var valid;
          valid = numItems > 0;
          return $scope.giCart.setStageValidity($scope.stage, valid);
        });
        return giCart.sendCart('Viewed Cart');
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCartStage', [
  'giCart', 'giCountry', function(Cart, Country) {
    return {
      restrict: 'E',
      templateUrl: 'gi.commerce.cartStage.html',
      scope: {
        model: '='
      },
      link: function($scope, elem, attrs) {
        return $scope.cart = Cart;
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCartSummary', [
  'giCart', function(giCart) {
    return {
      restrict: 'E',
      scope: {},
      transclude: true,
      templateUrl: 'gi.commerce.summary.html',
      link: function(scope, elem, attrs) {
        return scope.giCart = giCart;
      }
    };
  }
]);

var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

angular.module('gi.commerce').directive('giCheckout', [
  'giCart', 'usSpinnerService', 'Address', 'giPayment', '$modal', 'giUtil', function(Cart, Spinner, Address, Payment, $modal, Util) {
    return {
      restrict: 'E',
      scope: {
        model: '='
      },
      templateUrl: 'gi.commerce.checkout.html',
      link: function($scope, element, attrs) {
        var cardElement, fieldUsed, stopSpinner, wrapSpinner;
        stopSpinner = function() {
          Spinner.stop('gi-cart-spinner-1');
          return $scope.isSpinnerShown = false;
        };
        wrapSpinner = function(promise) {
          $scope.isSpinnerShown = true;
          Spinner.spin('gi-cart-spinner-1');
          return promise.then(stopSpinner, stopSpinner);
        };
        fieldUsed = function(prop) {
          return $scope.checkoutForm[prop].$dirty && $scope.checkoutForm[prop].$touched;
        };
        $scope.pageReady = true;
        $scope.cart = Cart;
        $scope.currentDate = new Date();
        $scope.isSpinnerShown = false;
        cardElement = Payment.stripe.mountElement('#checkout-card-container', Cart);
        cardElement.on('change', function(event) {
          if (event.complete) {
            $scope.cart.setCardElementValidity(true);
          } else {
            $scope.cart.setCardElementValidity(false);
          }
          return $scope.$digest();
        });
        $scope.$watch('model.me', function(me) {
          if ((me != null ? me.user : void 0) != null) {
            Cart.setCustomer(me.user);
            return Address.query({
              userId: me.user._id
            }).then(function(addresses) {
              return $scope.cart.addresses = addresses;
            });
          }
        });
        $scope.$watch('model.userCountry', function(newVal) {
          if (newVal != null) {
            return wrapSpinner(Cart.setCountry(newVal.code));
          }
        });
        $scope.subscribeNow = function() {
          $scope.inPayment = true;
          return wrapSpinner(Cart.handleSubscriptionRequest()).then(function() {
            return $scope.inPayment = false;
          }, function() {
            return $scope.inPayment = false;
          });
        };
        $scope.$on('giCart:paymentFailed', function(e, data) {
          var ref;
          if (data != null) {
            $scope.errorMessage = data;
            if (data.message != null) {
              $scope.errorMessage = data.message;
            }
            if (((ref = data.raw) != null ? ref.message : void 0) != null) {
              return $scope.errorMessage = data.raw.message;
            }
          } else {
            return $scope.errorMessage = 'An error has occured during checkout, please check the provided information and get in touch with us.';
          }
        });
        $scope.$on('giCart:paymentCompleted', function(e) {
          return $scope.removeError();
        });
        $scope.removeError = function() {
          return $scope.errorMessage = "";
        };
        $scope.showLoginModal = function(size) {
          var modalInstance;
          return modalInstance = $modal.open({
            templateUrl: 'vfq.loginModal.html',
            controller: 'loginModalController',
            size: size,
            backdrop: 'static',
            scope: $scope
          });
        };
        $scope.getCountrySorter = function() {
          var topCodes;
          topCodes = [];
          if ($scope.cart.getCountryCode()) {
            topCodes.push($scope.cart.getCountryCode());
          }
          if (!(indexOf.call(topCodes, "US") >= 0)) {
            topCodes.push("US");
          }
          if (!(indexOf.call(topCodes, "GB") >= 0)) {
            topCodes.push("GB");
          }
          return Util.countrySort(topCodes);
        };
        $scope.checkValid = function(country) {
          if (country) {
            return $scope.validCountry = true;
          }
        };
        $scope.isPropertyValidationError = function(prop, needsMessage) {
          var errorMessage, isInvalid;
          errorMessage = '';
          isInvalid = fieldUsed(prop) && $scope.checkoutForm[prop].$invalid;
          if (isInvalid) {
            if (prop === 'lastName') {
              if ($scope.checkoutForm[prop].$viewValue && $scope.checkoutForm[prop].$viewValue.includes(' ')) {
                errorMessage = 'Field must not include spaces.';
              } else {
                errorMessage = 'Field must be at least 2 latin letters without numbers.';
              }
            } else {
              errorMessage = "Field isn't not filled correctly.";
            }
          }
          if (needsMessage) {
            return errorMessage;
          } else {
            return isInvalid;
          }
        };
        $scope.isPropertyValidationSuccess = function(prop) {
          return fieldUsed(prop) && $scope.checkoutForm[prop].$valid && $scope.checkoutForm[prop].$viewValue !== "";
        };
        $scope.isConfirmPasswordSuccess = function(prop) {
          return $scope.isPropertyValidationSuccess(prop) && $scope.isPropertyValidationSuccess('password');
        };
        $scope.isUsernameTaken = function() {
          return fieldUsed('email') && (!$scope.checkoutForm.email.$error.email) && (!$scope.checkoutForm.email.$error.pattern) && $scope.checkoutForm.email.$error.giUsername;
        };
        $scope.$watch('checkoutForm.$valid', function(valid) {
          return $scope.cart.setCheckoutFormValidity(valid);
        });
        return $scope.$watch('checkoutForm.$pending', function(pending) {
          if (pending != null) {
            return $scope.cart.setCheckoutFormValidity(false);
          }
        });
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCountryForm', [
  '$q', 'giCurrency', 'giCountry', function($q, Currency, Country) {
    return {
      restrict: 'E',
      scope: {
        submitText: '@',
        model: '='
      },
      templateUrl: 'gi.commerce.countryForm.html',
      link: {
        pre: function($scope) {
          $scope.save = function() {
            $scope.model.selectedItem.acl = "public-read";
            return Country.save($scope.model.selectedItem).then(function() {
              var alert;
              alert = {
                name: 'country-saved',
                type: 'success',
                msg: "Country Saved."
              };
              $scope.$emit('event:show-alert', alert);
              $scope.$emit('country-saved', $scope.model.selectedItem);
              return $scope.clear();
            }, function(err) {
              var alert;
              alert = {
                name: 'country-not-saved',
                type: 'danger',
                msg: "Failed to save Country. " + err.data.error
              };
              return $scope.$emit('event:show-alert', alert);
            });
          };
          $scope.clear = function() {
            $scope.model.selectedItem = {};
            $scope.countryForm.$setPristine();
            $scope.confirm = false;
            return $scope.$emit('country-form-cleared');
          };
          return $scope.destroy = function() {
            if ($scope.confirm) {
              return Country.destroy($scope.model.selectedItem._id).then(function() {
                var alert;
                alert = {
                  name: 'country-deleted',
                  type: 'success',
                  msg: 'Country Deleted.'
                };
                $scope.$emit('event:show-alert', alert);
                $scope.$emit('country-deleted');
                return $scope.clear();
              }, function() {
                var alert;
                alert = {
                  name: "Country not deleted",
                  msg: "Country not deleted.",
                  type: "warning"
                };
                $scope.$emit('event:show-alert', alert);
                return $scope.confirm = false;
              });
            } else {
              return $scope.confirm = true;
            }
          };
        }
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCurrencyForm', [
  '$q', 'giCurrency', function($q, Currency) {
    return {
      restrict: 'E',
      scope: {
        item: '=',
        submitText: '@'
      },
      templateUrl: 'gi.commerce.currencyForm.html',
      link: {
        pre: function($scope) {
          $scope.save = function() {
            $scope.item.acl = "public-read";
            return Currency.save($scope.item).then(function() {
              var alert;
              alert = {
                name: 'cohort-saved',
                type: 'success',
                msg: "Currency Saved."
              };
              $scope.$emit('event:show-alert', alert);
              $scope.$emit('cohort-saved', $scope.item);
              return $scope.clear();
            }, function(err) {
              var alert;
              alert = {
                name: 'currency-not-saved',
                type: 'danger',
                msg: "Failed to save currency. " + err.data.error
              };
              return $scope.$emit('event:show-alert', alert);
            });
          };
          $scope.clear = function() {
            $scope.item = {};
            $scope.cohortForm.$setPristine();
            $scope.confirm = false;
            return $scope.$emit('currency-form-cleared');
          };
          return $scope.destroy = function() {
            if ($scope.confirm) {
              return Currency.destroy($scope.item._id).then(function() {
                var alert;
                alert = {
                  name: 'currency-deleted',
                  type: 'success',
                  msg: 'Currency Deleted.'
                };
                $scope.$emit('event:show-alert', alert);
                $scope.$emit('currency-deleted');
                return $scope.clear();
              }, function() {
                var alert;
                alert = {
                  name: "Currency not deleted",
                  msg: "Currency not deleted.",
                  type: "warning"
                };
                $scope.$emit('event:show-alert', alert);
                return $scope.confirm = false;
              });
            } else {
              return $scope.confirm = true;
            }
          };
        }
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCustomerForm', [
  '$q', 'giCurrency', 'giCart', 'giUtil', function($q, Currency, Cart, Util) {
    return {
      restrict: 'E',
      scope: {
        model: '=',
        item: '=',
        submitText: '@',
        stage: '@'
      },
      templateUrl: 'gi.commerce.customerForm.html',
      link: function($scope, elem, attrs) {
        var fieldUsed;
        $scope.emailRegex = Util.emailRegex;
        $scope.lastNameRegex = /(^[a-zA-Z]{2,}$)/;
        $scope.cart = Cart;
        $scope.cart.paymentType = $scope.cart.getPaymentType();
        if ($scope.item == null) {
          $scope.item = {};
        }
        $scope.requestLogin = function() {
          return $scope.$emit('event:show-login');
        };
        fieldUsed = function(prop) {
          return $scope.customerForm[prop].$dirty && $scope.customerForm[prop].$touched;
        };
        $scope.isPropertyValidationError = function(prop, needsMessage) {
          var errorMessage, isInvalid;
          errorMessage = '';
          isInvalid = fieldUsed(prop) && $scope.customerForm[prop].$invalid;
          if (isInvalid) {
            if (prop === 'lastName') {
              if ($scope.customerForm[prop].$viewValue && $scope.customerForm[prop].$viewValue.includes(' ')) {
                errorMessage = 'Field must not include spaces.';
              } else {
                errorMessage = 'Field must be at least 2 latin letters without numbers.';
              }
            } else {
              errorMessage = "Field isn't not filled correctly.";
            }
          }
          if (needsMessage) {
            return errorMessage;
          } else {
            return isInvalid;
          }
        };
        $scope.isPropertyValidationSuccess = function(prop) {
          return fieldUsed(prop) && $scope.customerForm[prop].$valid && $scope.customerForm[prop].$viewValue !== "";
        };
        $scope.isConfirmPasswordSuccess = function(prop) {
          return $scope.isPropertyValidationSuccess(prop) && $scope.isPropertyValidationSuccess('password');
        };
        $scope.isUsernameTaken = function() {
          return fieldUsed('email') && (!$scope.customerForm.email.$error.email) && (!$scope.customerForm.email.$error.pattern) && $scope.customerForm.email.$error.giUsername;
        };
        $scope.isEmailInvalid = function() {
          return fieldUsed('email') && ($scope.customerForm.email.$error.email || $scope.customerForm.email.$error.pattern);
        };
        $scope.$watch('customerForm.$valid', function(valid) {
          return $scope.cart.setStageValidity($scope.stage, valid);
        });
        $scope.$watch('customerForm.$pending', function(pending) {
          if (pending != null) {
            return $scope.cart.setStageValidity($scope.stage, false);
          }
        });
        return $scope.$watch('cart.business', function(business) {
          if (!business) {
            $scope.cart.setPaymentType(1);
            return $scope.cart.paymentType = $scope.cart.getPaymentType();
          }
        });
      }
    };
  }
]);

angular.module('gi.commerce').directive('giCustomerInfo', [
  'giCart', 'Address', function(Cart, Address) {
    return {
      restrict: 'E',
      templateUrl: 'gi.commerce.customerInfo.html',
      scope: {
        model: '=',
        stage: '@'
      },
      link: function($scope, elem, attrs) {
        var substagesValid;
        $scope.cart = Cart;
        $scope.selectedAddress = 0;
        $scope.selectAddress = function(id) {
          return $scope.selectedAddress = id;
        };
        if ($scope.model.me.user != null) {
          Address.query({
            userId: $scope.model.me.user._id
          }).then(function(addresses) {
            return $scope.cart.addresses = addresses;
          });
        }
        $scope.billingAddressOptions = {
          tabIndex: 3,
          showPhone: function() {
            return Cart.needsShipping() && (!$scope.cart.differentShipping);
          }
        };
        $scope.shippingAddressOptions = {
          tabIndex: 4,
          showPhone: function() {
            return Cart.needsShipping() && $scope.cart.differentShipping;
          }
        };
        substagesValid = function(stage) {
          return function() {
            var stage1, stage2;
            stage1 = !$scope.cart.isStageInvalid(stage + '-1');
            stage2 = !$scope.cart.isStageInvalid(stage + '-2');
            return stage1 && stage2;
          };
        };
        $scope.$watch('selectedAddress', function(value) {});
        $scope.$watch('addressForm.$valid', function(valid) {
          return $scope.cart.setStageValidity($scope.stage + '-2', valid);
        });
        return $scope.$watch(substagesValid($scope.stage), function(newVal) {
          return $scope.cart.setStageValidity($scope.stage, newVal);
        });
      }
    };
  }
]);

angular.module("gi.commerce").run(["$templateCache", function($templateCache) {$templateCache.put("gi.commerce.addressFormFields.html","<div ng-if=\"!selectaddress && item._id\" class=\"pull-right\"><a class=\"text-danger\" ng-click=\"deleteAddress(item)\">x</a></div>\r\n<legend>{{title}}   <h4 class=\"pull-right\" style=\"font-size: 11px;\"><span class=\"req\">*</span> Marks a required field.</h4>\r\n</legend>\r\n\r\n<div ng-if=\"selectaddress && addresses.length\" class=\"form-group\">\r\n  <label class=\"control-label\">Existing Address:</label>\r\n    <ui-select  tabindex=\"{{options.tabIndex + 1}}\" ng-model=\"selectedAddress\" ng-change=\"updateAddress(selectedAddress)\">\r\n      <ui-select-match>{{$select.selected.name}}</ui-select-match>\r\n      <ui-select-choices repeat=\"t in addresses | filter: $select.search\">\r\n        <div ng-bind=\"t.name ? t.name : t.line1\"></div>\r\n      </ui-select-choices>\r\n    </ui-select>\r\n</div>\r\n<div ng-if=\"!selectaddress\" class=\"form-group\"\r\n     ng-class=\"{\r\n       \'has-error\': isPropertyValidationError(\'{{prefix}}-name\'),\r\n       \'has-success\': isPropertyValidationSuccess(\'{{prefix}}-name\')}\">\r\n  <label class=\"control-label\">Address Name <span class=\"req\">*</span> : </label>\r\n  <input type=\"text\"\r\n         class=\"form-control\"\r\n         name=\"{{prefix}}-name\"\r\n         ng-model=\"item.name\"\r\n         required tabindex=\"{{options.tabIndex}}\"/>\r\n</div>\r\n<div class=\"form-group\"\r\n     ng-class=\"{\r\n       \'has-error\': isPropertyValidationError(\'{{prefix}}-line1\'),\r\n       \'has-success\': isPropertyValidationSuccess(\'{{prefix}}-line1\')}\">\r\n  <label class=\"control-label\">Address Line 1 <span class=\"req\">*</span> : </label>\r\n  <input type=\"text\"\r\n         class=\"form-control\"\r\n         name=\"{{prefix}}-line1\"\r\n         ng-model=\"item.line1\"\r\n         required tabindex=\"{{options.tabIndex}}\"/>\r\n   <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'{{prefix}}-line1\')\">\r\n     Required\r\n   </p>\r\n</div>\r\n<div class=\"form-group\" >\r\n  <label class=\"control-label\">Address Line 2:</label>\r\n  <input type=\"text\"\r\n         class=\"form-control\"\r\n         name=\"{{prefix}}-line2\"\r\n         ng-model=\"item.line2\" tabindex=\"{{options.tabIndex}}\"/>\r\n</div>\r\n<div class=\"form-group\"\r\n     ng-class=\"{\r\n       \'has-error\': isPropertyValidationError(\'{{prefix}}-city\'),\r\n       \'has-success\': isPropertyValidationSuccess(\'{{prefix}}-city\')}\">\r\n  <label class=\"control-label\">City <span class=\"req\">*</span> :</label>\r\n  <input type=\"text\"\r\n         class=\"form-control\"\r\n         name=\"{{prefix}}-city\"\r\n         ng-model=\"item.city\"\r\n         required tabindex=\"{{options.tabIndex}}\"/>\r\n   <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'{{prefix}}-city\')\">\r\n     Required\r\n   </p>\r\n</div>\r\n<div class=\"form-group\"\r\n     ng-class=\"{\r\n       \'has-error\': isPropertyValidationError(\'{{prefix}}-state\'),\r\n       \'has-success\': isPropertyValidationSuccess(\'{{prefix}}-state\')}\">\r\n  <label class=\"control-label\">{{getStateMessage()}} <span class=\"req\">*</span> :</label>\r\n  <input type=\"text\"\r\n         class=\"form-control\"\r\n         name=\"{{prefix}}-state\"\r\n         ng-model=\"item.state\"\r\n         required tabindex=\"{{options.tabIndex}}\"/>\r\n   <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'{{prefix}}-state\')\">\r\n      Required\r\n   </p>\r\n</div>\r\n<div class=\"form-group\"\r\n     ng-class=\"{\r\n       \'has-error\': isPropertyValidationError(\'{{prefix}}-code\'),\r\n       \'has-success\': isPropertyValidationSuccess(\'{{prefix}}-code\')}\">\r\n  <label class=\"control-label\">Post / Zip Code <span class=\"req\">*</span> :</label>\r\n  <input type=\"text\"\r\n         class=\"form-control\"\r\n         name=\"{{prefix}}-code\"\r\n         ng-model=\"item.code\"\r\n         required tabindex=\"{{options.tabIndex}}\"/>\r\n   <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'{{prefix}}-code\')\">\r\n      Required\r\n   </p>\r\n</div>\r\n<div class=\"form-group\"    ng-class=\"{\'has-success\': validCountry}\">\r\n  <label  class=\"control-label\">Country <span class=\"req\">*</span>:</label>\r\n\r\n  <ui-select  tabindex=\"{{options.tabIndex}}\" required on-select=\"checkValid($select.selected.name)\" ng-model=\"item.country\">\r\n    <ui-select-match >{{$select.selected.name}}</ui-select-match>\r\n    <ui-select-choices\r\n repeat=\"t.code as t in model.countries | orderBy:getCountrySorter() | filter: $select.search\">\r\n      <div ng-bind-html=\"t.name | highlight: $select.search\"></div>\r\n    </ui-select-choices>\r\n  </ui-select>\r\n</div>\r\n\r\n  <div class=\"form-group\" ng-if=\"options.showPhone()\"\r\n       ng-class=\"{\r\n         \'has-error\': isPropertyValidationError(\'{{prefix}}-phone\'),\r\n         \'has-success\': isPropertyValidationSuccess(\'{{prefix}}-phone\')}\">\r\n    <label class=\"control-label\">Phone Number (for Delivery Courier) <span class=\"req\">*</span> :</label>\r\n    <input type=\"text\"\r\n        class=\"form-control\"\r\n        name=\"{{prefix}}-phone\"\r\n        ng-model=\"item.phone\"\r\n        required tabindex=\"{{options.tabIndex}}\"/>\r\n    <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'{{prefix}}-phone\')\">\r\n     Required\r\n    </p>\r\n  </div>\r\n");
$templateCache.put("gi.commerce.addtocart.html","<div ng-hide=\"attrs.id\">\r\n    <a class=\"btn btn-lg btn-primary\" ng-disabled=\"true\" ng-transclude></a>\r\n</div>\r\n<div ng-show=\"attrs.id\">\r\n    <div ng-hide=\"inCart()\">\r\n        <a class=\"btn btn-lg btn-primary\"\r\n           ng-click=\"addItem(item)\"\r\n           ng-transclude></a>\r\n    </div>\r\n    <div class=\"alert alert-info\"  ng-show=\"inCart()\">\r\n        This item is in your cart\r\n    </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.cart.html","<div class=\"row\">\r\n  <div class=\"col-xs-12 col-sm-6 col-sm-offset-3 well\" ng-show=\"giCart.totalItems() === 0\">\r\n    <p>Your cart is empty</p>\r\n  </div>\r\n  <div class=\"col-xs-12\">\r\n    <span us-spinner=\"{radius:30, width:8, length: 16}\" spinner-key=\"gi-cart-spinner-1\"></span>\r\n    <div class=\"table-responsive hidden-xs\" ng-show=\"giCart.totalItems() > 0\">\r\n      <table class=\"table giCart cart\">\r\n        <thead>\r\n          <tr>\r\n            <th></th>\r\n            <th></th>\r\n            <th></th><!-- <th>Quantity</th> -->\r\n            <!-- <th ng-if=\"giCart.isTaxApplicable()\"><div class=\"pull-right\">Tax</div></th>\r\n            <th><div class=\"pull-right\">Total</div></th> -->\r\n            <th></th>\r\n            <th></th>\r\n\r\n            <th><div class=\"pull-right\">Amount</div></th>\r\n\r\n          </tr>\r\n        </thead>\r\n        <tfoot>\r\n          <tr ng-show=\"giCart.getShipping()\">\r\n            <th></th>\r\n            <th></th>\r\n            <th></th>\r\n            <th></th>\r\n            <th>Shipping:</th>\r\n            <th><div class=\"pull-right\">{{ giCart.getShipping() | giCurrency:giCart.getCurrencySymbol }}</div></th>\r\n          </tr>\r\n          <tr >\r\n            <th></th>\r\n            <th></th>\r\n            <th></th>\r\n            <th ></th>\r\n            <th><div class=\"pull-right\">Sub Total\r\n              <span ng-if=\"giCart.hasDiscount()\"> incl {{giCart.getDiscount()}}% Discount</span>:</div></th>\r\n              <th><div class=\"pull-right\">{{ giCart.getSubTotal() - giCart.discount()| giCurrency:giCart.getCurrencySymbol}}  </div></th>\r\n            </tr>\r\n            <tr ng-if=\"giCart.isTaxApplicable()\">\r\n              <th></th>\r\n              <th></th>\r\n              <th></th>\r\n              <th></th>\r\n              <th><div class=\"pull-right\">Tax:</div></th>\r\n              <th><div class=\"pull-right\">{{ giCart.getTaxTotal() | giCurrency:giCart.getCurrencySymbol }}</div></th>\r\n            </tr>\r\n            <tr>\r\n              <th></th>\r\n              <th></th>\r\n              <th></th>\r\n              <th></th>\r\n              <th><div class=\"pull-right\">Total:</div></th>\r\n              <th><div class=\"pull-right\">{{ giCart.totalCost() | giCurrency:giCart.getCurrencySymbol }}</div></th>\r\n            </tr>\r\n          </tfoot>\r\n          <tbody>\r\n            <tr ng-repeat=\"item in giCart.getItems() track by $index\">\r\n              <td><span ng-click=\"giCart.removeItem($index)\" class=\"glyphicon glyphicon-remove\"></span></td>\r\n              <td>{{ item.getName() }}</td>\r\n              <!-- <td><span class=\"glyphicon glyphicon-minus\" ng-class=\"{\'disabled\':item.getQuantity()==1}\"\r\n                ng-click=\"item.getQuantity()==1 ? giCart.removeItem($index) : item.setQuantity(-1, true)\"></span>&nbsp;&nbsp;\r\n\r\n                <input class=\"counter-input\" maxlength=\"3\" type=\"text\"  ng-model=\"item._quantity\" ng-change=\"item.setQuantity(item._quantity)\">&nbsp;&nbsp;\r\n\r\n                <span class=\"glyphicon glyphicon-plus\" ng-click=\"item.setQuantity(1, true)\"></span></td> -->\r\n              <td><div class=\"pull-right\"></div></td>\r\n              <td ng-if=\"giCart.isTaxApplicable()\"><div class=\"pull-right\"></div></td>\r\n              <td><div class=\"pull-right\"></div></td>\r\n              <td ng-if=\"!giCart.isTaxApplicable()\" ><div class=\"pull-right\"></div></td>\r\n\r\n              <td><div class=\"pull-right\">{{ item.getSubTotal(giCart.getPricingInfo()) | giCurrency:giCart.getCurrencySymbol}}</div></td>\r\n            </tr>\r\n          </tbody>\r\n        </table>\r\n\r\n        </div>\r\n        <div class=\"visible-xs\" ng-show=\"giCart.totalItems() > 0\">\r\n          <div class=\"mobile-cart-box well\" ng-repeat=\"item in giCart.getItems() track by $index\">\r\n            <h4>{{item.getName() }} </h4>\r\n            <div class=\"row\">\r\n              <div class=\"col-xs-3\">\r\n                <p> Quantity: </p>\r\n              </div>\r\n              <div class=\"col-xs-3\">\r\n                <p> Price: </p>\r\n              </div>\r\n              <div class=\"col-xs-3\" ng-if=\"giCart.isTaxApplicable()\">\r\n                <p> Tax: </p>\r\n              </div>\r\n            </div>\r\n            <div class=\"row\">\r\n              <div class=\"col-xs-3\">\r\n                <p><span class=\"glyphicon glyphicon-minus\" ng-class=\"{\'disabled\':item.getQuantity()==1}\"\r\n                  ng-click=\"item.setQuantity(-1, true)\"></span>&nbsp;&nbsp;\r\n                  {{ item.getQuantity() | number }}&nbsp;&nbsp;\r\n                  <span class=\"glyphicon glyphicon-plus\" ng-click=\"item.setQuantity(1, true)\"></span>\r\n                </p>\r\n              </div>\r\n              <div class=\"col-xs-3\">\r\n                <p>{{ item.getSubTotal(giCart.getPricingInfo()) | giCurrency:giCart.getCurrencySymbol}}</p>\r\n              </div>\r\n              <div class=\"col-xs-3\" ng-if=\"giCart.isTaxApplicable()\">\r\n                <p>{{ item.getTaxTotal(giCart.getPricingInfo()) | giCurrency:giCart.getCurrencySymbol}}</p>\r\n              </div>\r\n              <div class=\"col-xs-3\">\r\n                <p><a ng-click=\"giCart.removeItem($index)\"> Remove </a></p>\r\n              </div>\r\n            </div>\r\n          </div>\r\n          <div class=\"well\" style=\"height: 200px;\">\r\n            <h4>Order Summary </h4>\r\n            <div class=\"row\">\r\n              <div class=\"col-xs-6\">\r\n                <p style=\"text-align: left;\"> Sub Total<span ng-if=\"giCart.hasDiscount()\"> incl {{giCart.getDiscount()}}% discount</span>:  </p>\r\n              </div>\r\n              <div class=\"col-xs-6\">\r\n                <p style=\"text-align:right\">{{ giCart.getSubTotal() - giCart.discount()| giCurrency:giCart.getCurrencySymbol}}</p>\r\n              </div>\r\n            </div>\r\n            <div class=\"row\">\r\n              <div class=\"col-xs-6\">\r\n                  <p style=\"text-align: left;\"> Total Tax: </p>\r\n              </div>\r\n              <div class=\"col-xs-6\">\r\n                <p style=\"text-align:right\">{{ giCart.getTaxTotal() | giCurrency:giCart.getCurrencySymbol }}</p>\r\n              </div>\r\n            </div>\r\n            <div class=\"row\">\r\n              <div class=\"col-xs-6\" ng-show=\"giCart.getShipping()\">\r\n                <p style=\"text-align:right\"> Shipping: </p>\r\n              </div>\r\n\r\n              <div class=\"col-xs-6\" ng-show=\"giCart.getShipping()\">\r\n                <p style=\"text-align:right\">{{ giCart.getShipping() | giCurrency:giCart.getCurrencySymbol }}</p>\r\n              </div>\r\n\r\n            </div>\r\n\r\n            <div class=\"row\">\r\n              <div class=\"col-xs-6\"><p style=\" text-align: left; font-weight: bold\"> Order Total: </p></div>\r\n              <div class=\"col-xs-6\">\r\n                <p style=\"text-align:right\"><strong>{{ giCart.totalCost() | giCurrency:giCart.getCurrencySymbol }}</strong></p>\r\n              </div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      </div>\r\n    </div>\r\n    <gi-discount-form>\r\n    </gi-discount-form>\r\n\r\n    <style>\r\n    .giCart.cart span[ng-click] {\r\n      cursor: pointer;\r\n    }\r\n    .giCart.cart .glyphicon.disabled {\r\n      color:#aaa;\r\n    }\r\n    </style>\r\n");
$templateCache.put("gi.commerce.cartStage.html","<div class=\"row gi-checkout\" style=\"border-bottom:0;\">\r\n  <div class=\"col-xs-3 gi-checkout-stage\"\r\n       ng-class=\"{complete: cart.getStage()>1, active: cart.getStage()==1}\">\r\n    <div class=\"text-center gi-checkout-stagenum\">Review</div>\r\n    <div class=\"progress\"><div class=\"progress-bar\"></div></div>\r\n    <a ng-click=\"cart.setStage(1)\" class=\"gi-checkout-dot\" gi-focus=\"cart.getStage()==1\"></a>\r\n  </div>\r\n  <div class=\"col-xs-3 gi-checkout-stage\"\r\n    ng-class=\"{complete: cart.getStage()>2, active: cart.getStage()==2, disabled: cart.getStage()<2}\">\r\n    <div class=\"text-center gi-checkout-stagenum\">Details</div>\r\n    <div class=\"progress\"><div class=\"progress-bar\"></div></div>\r\n    <a ng-click=\"cart.setStage(2)\" class=\"gi-checkout-dot\" gi-focus=\"cart.getStage()==2\"></a>\r\n  </div>\r\n  <div class=\"col-xs-3 gi-checkout-stage\"\r\n    ng-class=\"{complete: cart.getStage()>3, active: cart.getStage()==3, disabled: cart.getStage()<3}\">\r\n    <div class=\"text-center gi-checkout-stagenum\">Payment</div>\r\n    <div class=\"progress\"><div class=\"progress-bar\"></div></div>\r\n    <a ng-click=\"cart.setStage(3)\" class=\"gi-checkout-dot\" gi-focus=\"cart.getStage()==3\"></a>\r\n  </div>\r\n  <div class=\"col-xs-3 gi-checkout-stage\"\r\n       ng-class=\"{complete: cart.getStage()>4, active: cart.getStage()==4, disabled: cart.getStage()<4}\">\r\n    <div class=\"text-center gi-checkout-stagenum\">Complete</div>\r\n    <div class=\"progress\"><div class=\"progress-bar\"></div></div>\r\n    <a ng-click=\"cart.setStage(4)\" class=\"gi-checkout-dot\" gi-focus=\"cart.getStage()==4\"></a>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.checkout.html","<div class=\"container preloader-wrapper\" ng-if=\"pageReady == false\">\r\n  <div class=\"preloader\">\r\n    <div class=\"dot\"></div>\r\n    <div class=\"dot\"></div>\r\n    <div class=\"dot\"></div>\r\n  </div>\r\n</div>\r\n<div ng-show=\"pageReady\" class=\"container gi-cart checkout-container\">\r\n  <div class=\"row\" ng-show=\"cart.totalItems() === 0\">\r\n    <div class=\"col-xs-12 col-sm-6 col-sm-offset-3 well\">\r\n      <p>Your cart is empty</p>\r\n    </div>\r\n  </div>\r\n  <div ng-cloak class=\"small-gap\" ng-show=\"cart.totalItems() > 0\">\r\n    <span us-spinner=\"{radius:30, width:8, length: 16}\" spinner-key=\"gi-cart-spinner-1\"></span>\r\n    <div ng-form name=\"checkoutForm\" class=\"checkout-form\">\r\n      <div class=\"checkout-left-menu-container\">\r\n        <div class=\"checkout-colored-menu relative-container\">\r\n          <div class=\"login-reminder-container\" ng-show=\"!model.me.loggedIn\">\r\n            <span class=\"checkout-text\">Already have an account? <a class=\"checkout-href\" ng-click=\"showLoginModal()\">Sign in</a></span>\r\n          </div>\r\n          <div class=\"checkout-form-section\">\r\n            <div class=\"checkout-form-section-title\">\r\n              ACCOUNT\r\n            </div>\r\n            <div class=\"checkout-input-container\" >\r\n              <div class=\"checkout-input-row\" ng-if=\"!model.me.loggedIn\">\r\n                <div class=\"checkout-half-row checkout-input-wrapper\">\r\n                  <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'firstName\'), \'has-success\': isPropertyValidationSuccess(\'firstName\')}\">\r\n                    <input class=\"form-control\"\r\n                    type=\"text\"\r\n                    tabindex=\"1\"\r\n                    name=\"firstName\"\r\n                    ng-model=\"cart.customerInfo.firstName\"\r\n                    placeholder=\"First Name\"\r\n                    required/>\r\n                  </div>\r\n                </div><!--comment to avoid having a newline\r\n                --><div class=\"checkout-half-row checkout-input-wrapper\">\r\n                  <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'lastName\'), \'has-success\': isPropertyValidationSuccess(\'lastName\')}\">\r\n                    <input class=\"form-control\"\r\n                    type=\"text\"\r\n                    tabindex=\"1\"\r\n                    name=\"lastName\"\r\n                    ng-model=\"cart.customerInfo.lastName\"\r\n                    ng-pattern=\"lastNameRegex\"\r\n                    placeholder=\"Last Name\"\r\n                    required/>\r\n                  </div>\r\n                </div>\r\n              </div>\r\n              <div class=\"checkout-input-row checkout-input-wrapper\" ng-if=\"!model.me.loggedIn\">\r\n                <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'email\'), \'has-success\': isPropertyValidationSuccess(\'email\')}\">\r\n                  <input class=\"form-control\"\r\n                  type=\"email\"\r\n                  tabindex=\"1\"\r\n                  name=\"email\"\r\n                  placeholder=\"Email\"\r\n                  ng-model=\"cart.customerInfo.email\"\r\n                  ng-pattern=\"emailRegex\"\r\n                  gi-username\r\n                  required/>\r\n                </div>\r\n              </div>\r\n              <div class=\"checkout-input-row\" ng-if=\"!model.me.loggedIn\">\r\n                <div class=\"checkout-half-row checkout-input-wrapper form-group\"\r\n                ng-class=\"{\'has-error\': isPropertyValidationError(\'password\'), \'has-success\': isPropertyValidationSuccess(\'password\')}\">\r\n                  <input class=\"form-control\"\r\n                  type=\"password\"\r\n                  tabindex=\"1\"\r\n                  name=\"password\"\r\n                  placeholder=\"Password\"\r\n                  ng-model=\"cart.customerInfo.password\"\r\n                  gi-password\r\n                  ng-required=\"!model.me.loggedIn\"/>\r\n                </div><!--comment to avoid having a newline\r\n                --><div class=\"checkout-half-row checkout-input-wrapper form-group\"\r\n                ng-class=\"{\'has-error\': isPropertyValidationError(\'confirm\'), \'has-success\': isConfirmPasswordSuccess(\'confirm\')}\">\r\n                  <input class=\"form-control\"\r\n                  type=\"password\"\r\n                  tabindex=\"1\"\r\n                  name=\"confirm\"\r\n                  ng-model=\"cart.customerInfo.confirm\"\r\n                  placeholder=\"Confirm Password\"\r\n                  gi-match=\"item.password\"\r\n                  ng-required=\"!model.me.loggedIn\"\r\n                  tabindex=\"1\"/>\r\n                </div>\r\n              </div>\r\n              <div class=\"checkout-input-row form-group\"\r\n              ng-class=\"{\'has-error\': isPropertyValidationError(\'companyName\'), \'has-success\': isPropertyValidationSuccess(\'companyName\')}\">\r\n                <div class=\"checkout-half-row checkout-input-wrapper\">\r\n                  <input class=\"form-control\"\r\n                  type=\"text\"\r\n                  tabindex=\"1\"\r\n                  name=\"companyName\"\r\n                  ng-model=\"cart.company.name\"\r\n                  placeholder=\"Company (optional)\"/>\r\n                </div>\r\n              </div>\r\n              <!-- <div class=\"checkout-input-row checkout-input-wrapper\">\r\n                <div class=\"checkbox checkbox-circle\">\r\n                  <input type=\"checkbox\" ng-model=\"insights\">\r\n                  <label class=\"checkout-checkbox\" ng-click=\"insights = !insights\">Do you want to receive updates and insights from VFQ?</label>\r\n                </div>\r\n              </div> -->\r\n            </div>\r\n          </div>\r\n          <div class=\"checkout-form-section\">\r\n            <div class=\"checkout-form-section-title\">\r\n              PAYMENT METHOD\r\n            </div>\r\n            <span class=\"checkout-text\"> Need to pay with an invoice? You can request one <a class=\"checkout-href\" href=\"/\">here</a></span>\r\n            <div class=\"checkout-input-container\" >\r\n              <div class=\"checkout-input-row checkout-input-wrapper\">\r\n                <div class=\"checkout-card-wrapper\">\r\n                  <div id=\"checkout-card-container\"></div>\r\n                </div>\r\n              </div>\r\n            </div>\r\n          </div>\r\n          <div class=\"checkout-form-section\">\r\n            <div class=\"checkout-form-section-title\">\r\n              BILLING ADDRESS\r\n            </div>\r\n            <div class=\"checkout-input-container\">\r\n              <div class=\"checkout-input-row checkout-input-wrapper\">\r\n                <div class=\"form-group\"\r\n                ng-class=\"{\'has-error\': isPropertyValidationError(\'billing-line1\'),\'has-success\': isPropertyValidationSuccess(\'billing-line1\')}\">\r\n                  <input class=\"form-control\"\r\n                  type=\"text\"\r\n                  tabindex=\"1\"\r\n                  placeholder=\"Address line 1\"\r\n                  name=\"billing-line1\"\r\n                  ng-model=\"cart.billingAddress.line1\"\r\n                  required/>\r\n                </div>\r\n              </div>\r\n              <div class=\"checkout-input-row checkout-input-wrapper\">\r\n                <div class=\"form-group\">\r\n                  <input class=\"form-control\"\r\n                  type=\"text\"\r\n                  tabindex=\"1\"\r\n                  placeholder=\"Address line 2\"\r\n                  ng-model=\"cart.billingAddress.line2\"/>\r\n                </div>\r\n              </div>\r\n              <div class=\"checkout-input-row\">\r\n                <div class=\"checkout-quarter-row checkout-input-wrapper form-group\"\r\n                ng-class=\"{\'has-error\': isPropertyValidationError(\'billing-city\'), \'has-success\': isPropertyValidationSuccess(\'billing-city\')}\">\r\n                  <input class=\"form-control\"\r\n                  type=\"text\"\r\n                  tabindex=\"1\"\r\n                  name=\"billing-city\"\r\n                  placeholder=\"City\"\r\n                  ng-model=\"cart.billingAddress.city\"\r\n                  required/>\r\n                </div><!--comment to avoid having a newline\r\n                --><div class=\"checkout-quarter-row checkout-input-wrapper form-group\"\r\n                ng-class=\"{\'has-error\': isPropertyValidationError(\'billing-code\'), \'has-success\': isPropertyValidationSuccess(\'billing-code\')}\">\r\n                  <input class=\"form-control\"\r\n                  type=\"text\"\r\n                  tabindex=\"1\"\r\n                  name=\"billing-code\"\r\n                  placeholder=\"Postcode\"\r\n                  ng-model=\"cart.billingAddress.code\"\r\n                  required/>\r\n                </div><!--comment to avoid having a newline\r\n                --><div class=\"checkout-half-row checkout-input-wrapper form-group\" ng-class=\"{\'has-success\': validCountry}\">\r\n                  <ui-select class=\"checkout-select\" tabindex=\"1\" required on-select=\"checkValid($select.selected.name)\" ng-model=\"cart.billingAddress.country\">\r\n                    <ui-select-match placeholder=\"Country\">{{$select.selected.name}}</ui-select-match>\r\n                    <ui-select-choices repeat=\"t.code as t in model.countries | orderBy:getCountrySorter() | filter: $select.search\">\r\n                      <div ng-bind-html=\"t.name | highlight: $select.search\"></div>\r\n                    </ui-select-choices>\r\n                  </ui-select>\r\n                </div>\r\n              </div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      </div>\r\n      <div class=\"checkout-right-menu-container\">\r\n        <div class=\"checkout-summary-container\">\r\n          <div class=\"summary-title\">Summary</div>\r\n          <table class=\"table checkout-table\">\r\n            <thead>\r\n              <tr>\r\n                <th><span class=\"checkout-text\">Order</span></th>\r\n                <th></th>\r\n              </tr>\r\n            </thead>\r\n            <tfoot>\r\n              <tr class=\"checkout-total-row\">\r\n                <th>Total</th>\r\n                <th><div class=\"pull-right\">{{ cart.totalCost() | giCurrency:cart.getCurrencySymbol }}</div></th>\r\n              </tr>\r\n            </tfoot>\r\n            <tbody>\r\n              <tr ng-repeat=\"item in cart.getItems() track by $index\">\r\n                <td>{{ item.getName() }}</td>\r\n                <td><div class=\"pull-right\">{{ item.getTotal(cart.getPricingInfo()) | giCurrency:cart.getCurrencySymbol}}</div></td>\r\n              </tr>\r\n            </tbody>\r\n          </table>\r\n        </div>\r\n        <div class=\"checkout-confirmation-container-wrapper\">\r\n          <div class=\"checkout-colored-menu\">\r\n            <div class=\"checkout-form-section checkout-submit-section\">\r\n              <div class=\"checkout-form-section-title\">\r\n                REVIEW & CONFIRM\r\n              </div>\r\n              <div class=\"checkout-submit-text-container\">\r\n                <div class=\"checkout-submit-text\">\r\n                    <p class=\"checkout-submit-paragraph\">\r\n                      You will be charged upon confirmation of your purchase. Your next payment will be on {{currentDate.toLocaleString(\'default\', { month: \'long\' })}} {{currentDate.getDate()}}, {{currentDate.getFullYear()}}.\r\n                    </p>\r\n                    <p class=\"checkout-submit-paragraph\">\r\n                      If you decide to cancel your subscription at any point simply email us at education@valueflowquality.com. You will have until the term expiry date to continue using your subscription.\r\n                    </p>\r\n                </div>\r\n              </div>\r\n              <div class=\"btn btn-primary checkout-submit\"\r\n              tabindex=\"9\"\r\n              ng-click=\"subscribeNow()\"\r\n              gi-enter=\"subscribeNow()\"\r\n              ng-disabled=\"cart.isCheckoutFormInvalid() || isSpinnerShown\">\r\n                Confirm purchase\r\n              </div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      </div>\r\n    </div>\r\n  </div>\r\n  <div class=\"row medium-gap\">\r\n    <div ng-if=\"errorMessage\" ng-click=\"removeError()\" class=\"error-box\">{{ errorMessage }}</div>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.countryForm.html","<div ng-form name=\"countryForm\" class=\"well form\">\r\n  <div class=\"form-group\">\r\n    <label>Name:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"countryName\"\r\n           ng-model=\"model.selectedItem.name\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label>Code:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"countryCode\"\r\n           ng-model=\"model.selectedItem.code\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label class=\"control-label\">Market:</label>\r\n    <ui-select ng-model=\"model.selectedItem.marketId\">\r\n      <ui-select-match>{{$select.selected.name}}</ui-select-match>\r\n      <ui-select-choices repeat=\"c._id as c in model.markets  | filter: $select.search\">\r\n        <div ng-bind-html=\"c.name | highlight: $select.search\"></div>\r\n      </ui-select-choices>\r\n    </ui-select>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <div class=\"checkbox\">\r\n      <label>\r\n        <input type=\"checkbox\" ng-model=\"model.selectedItem.default\"> Use as Default Country?\r\n      </label>\r\n    </div>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <button class=\"form-control btn btn-primary btn-save-asset\"\r\n            ng-click=\"save()\">{{submitText}}</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"countryForm.$dirty || model.selectedItem._id\">\r\n    <button class=\"form-control btn btn-warning\"\r\n            ng-click=\"clear()\">Cancel</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"model.selectedItem._id\">\r\n    <button class=\"form-control btn btn-danger\" ng-click=\"destroy()\">\r\n      Delete <span ng-if=\"confirm\">- Are you sure? Click again to confirm</span>\r\n    </button>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.currencyForm.html","<div ng-form name=\"currencyForm\" class=\"well form\">\r\n  <div class=\"form-group\">\r\n    <label>Name:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"currencyName\"\r\n           ng-model=\"item.name\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label>Code:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"currencyCode\"\r\n           ng-model=\"item.code\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label>Symbol:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"currencySymbol\"\r\n           ng-model=\"item.symbol\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <button class=\"form-control btn btn-primary btn-save-asset\"\r\n            ng-click=\"save()\">{{submitText}}</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"currencyForm.$dirty || item._id\">\r\n    <button class=\"form-control btn btn-warning\"\r\n            ng-click=\"clear()\">Cancel</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"item._id\">\r\n    <button class=\"form-control btn btn-danger\" ng-click=\"destroy()\">\r\n      Delete <span ng-if=\"confirm\">- Are you sure? Click again to confirm</span>\r\n    </button>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.customerForm.html","<div ng-form name=\"customerForm\" class=\"well form\">\r\n  <div class=\"row\">\r\n    <div class=\"col-md-12\">\r\n      <div class=\"form-group\" ng-if=\"model.me.loggedIn\">\r\n        Hi {{model.me.user.firstName}} welcome back. We will e-mail confirmation of your order to your e-mail address:\r\n        <strong>{{model.me.user.email}}</strong>\r\n      </div>\r\n      <div class=\"form-group\" ng-if=\"!model.me.loggedIn\">\r\n        Already have an account? <a ng-click=\"requestLogin()\">Please Sign In</a>\r\n      </div>\r\n      <div class=\"form-group\">\r\n        <h4 class=\"pull-right\" style=\"font-size: 11px;\"><span class=\"req\">*</span> Marks a required field.</h4>\r\n      </div>\r\n      <div class=\"form-group\">\r\n        <div class=\"checkbox checkbox-success checkbox-circle\">\r\n          <input type=\"checkbox\" ng-model=\"cart.business\" tabindex=\"1\" autofocus>\r\n          <label ng-click=\"cart.business = !cart.business\">Buying for a company?  </label>\r\n        </div>\r\n      </div>\r\n      <div ng-show=\"cart.business\" class=\"form-group\">\r\n        <label class=\"control-label\">Choose payment method<span class=\"req\">*</span> :</label>\r\n        <div class=\"radio-menu\">\r\n          <div class=\"radio-item\">\r\n            <input type=\"radio\" ng-model=\"cart.paymentType\" ng-change=\"cart.setPaymentType(1)\" ng-value=\"1\"/>\r\n            <label ng-click=\"cart.setPaymentType(1); cart.paymentType=cart.getPaymentType()\">Card  </label>\r\n          </div>\r\n          <div class=\"radio-item\">\r\n            <input type=\"radio\" ng-model=\"cart.paymentType\" ng-change=\"cart.setPaymentType(2)\" ng-value=\"2\"/>\r\n            <label ng-click=\"cart.setPaymentType(2); cart.paymentType=cart.getPaymentType()\">Invoice  </label>\r\n          </div>\r\n        </div>\r\n      </div>\r\n    </div>\r\n    <div class=\"col-md-12\" ng-if=\"!model.me.loggedIn\"  >\r\n        <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'firstName\'), \'has-success\': isPropertyValidationSuccess(\'firstName\')}\">\r\n        <label class=\"control-label\">First Name <span class=\"req\">*</span> :</label>\r\n        <input type=\"text\"\r\n               class=\"form-control\"\r\n               name=\"firstName\"\r\n               ng-model=\"item.firstName\"\r\n               required tabindex=\"1\"/>\r\n         <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'firstName\')\">\r\n            Please enter your first name.\r\n         </p>\r\n      </div>\r\n      <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'lastName\'), \'has-success\': isPropertyValidationSuccess(\'lastName\')}\">\r\n        <label class=\"control-label\">Last Name <span class=\"req\">*</span> :</label>\r\n        <input type=\"text\"\r\n               class=\"form-control\"\r\n               name=\"lastName\"\r\n               ng-model=\"item.lastName\"\r\n               ng-pattern=\"lastNameRegex\"\r\n               required tabindex=\"1\" ng-trim=\"false\"/>\r\n         <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'lastName\')\">\r\n           {{isPropertyValidationError(\'lastName\', true)}}\r\n         </p>\r\n      </div>\r\n      <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'email\'), \'has-success\': isPropertyValidationSuccess(\'email\')}\">\r\n        <label class=\"control-label\">Email <span class=\"req\">*</span> :</label>\r\n        <input type=\"email\"\r\n               class=\"form-control\"\r\n               name=\"email\"\r\n               ng-model=\"item.email\"\r\n               required\r\n               gi-username\r\n               ng-pattern=\"emailRegex\" tabindex=\"1\"/>\r\n         <p class=\"control-label\" ng-show=\"isEmailInvalid()\">\r\n            Please enter a valid e-mail.\r\n         </p>\r\n         <p class=\"control-label\" ng-show=\"isUsernameTaken()\">\r\n            Username already taken.\r\n         </p>\r\n      </div>\r\n      <div class=\"form-group\"  ng-class=\"{\'has-error\': isPropertyValidationError(\'password\'), \'has-success\': isPropertyValidationSuccess(\'password\')}\">\r\n        <label class=\"control-label\">Password <span ng-if=\"!model.me.loggedIn\" class=\"req\">*</span> :</label>\r\n        <input type=\"password\"\r\n               class=\"form-control\"\r\n               name=\"password\"\r\n               ng-model=\"item.password\"\r\n               ng-required=\"!model.me.loggedIn\"\r\n               gi-password tabindex=\"1\" />\r\n         <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'password\')\">\r\n            Password does not meet minimum requirements (8 characters, at least one number)\r\n         </p>\r\n      </div>\r\n      <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'confirm\'), \'has-success\': isConfirmPasswordSuccess(\'confirm\')}\">\r\n        <label class=\"control-label\">Confirm Password <span class=\"req\">*</span> :</label>\r\n        <input type=\"password\"\r\n               class=\"form-control\"\r\n               name=\"confirm\"\r\n               ng-model=\"item.confirm\"\r\n               ng-required=\"!model.me.loggedIn\"\r\n               gi-match=\"item.password\"  tabindex=\"1\"/>\r\n        <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'confirm\')\">\r\n           Passwords do not match\r\n        </p>\r\n      </div>\r\n    </div>\r\n    <div class=\"col-md-12\">\r\n      <div class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'companyName\'), \'has-success\': isPropertyValidationSuccess(\'companyName\')}\">\r\n        <label>Company Name<span class=\"req\" ng-if=\"cart.business\">*</span>:</label>\r\n        <input type=\"text\"\r\n               class=\"form-control\"\r\n               name=\"companyName\"\r\n               ng-model=\"cart.company.name\"\r\n               ng-required=\"cart.business\"\r\n               ng-disabled=\"!cart.business\" tabindex=\"1\"/>\r\n        <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'companyName\')\">\r\n          The company name has not been entered\r\n        </p>\r\n      </div>\r\n      <div ng-if=\"cart.isTaxApplicable()\" class=\"form-group\" ng-class=\"{\'has-error\': isPropertyValidationError(\'vat\'), \'has-success\': isPropertyValidationSuccess(\'vat\')}\">\r\n        <label class=\"control-label\">{{cart.taxName() || \'VAT\'}} Number (optional):</label>\r\n        <input type=\"text\"\r\n               class=\"form-control\"\r\n               name=\"vat\"\r\n               ng-model=\"cart.company.VAT\"\r\n               ng-disabled=\"!cart.business\"\r\n               gi-vat tabindex=\"2\"/>\r\n         <p class=\"control-label\" ng-show=\"isPropertyValidationError(\'vat\')\">\r\n            {{cart.taxName() || \'VAT\'}} Number is invalid (have you included the 2 digit country code?)\r\n         </p>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.customerInfo.html","<div class=\"row medium-gap\">\r\n  <div class=\"col-md-4 col-md-push-8\">\r\n    <gi-order-summary></gi-order-summary>\r\n  </div>\r\n  <div class=\"col-md-8 col-md-pull-4\">\r\n    <gi-customer-form item=\"cart.customerInfo\" model=\"model\" stage=\"{{stage}}-1\"><gi-customer-form>\r\n  </div>\r\n</div>\r\n\r\n<div class=\"row\">\r\n  <div class=\"col-md-8\">\r\n    <span us-spinner=\"{radius:30, width:8, length: 16}\" spinner-key=\"gi-cart-spinner-1\"></span>\r\n    <div ng-form name=\"addressForm\" class=\"form well\">\r\n        <div ng-if=\"cart.needsShipping()\" class=\"col-md-12\">\r\n          <div class=\"form-group\">\r\n            <div class=\"checkbox checkbox-success checkbox-circle\">\r\n              <input type=\"checkbox\" ng-model=\"cart.differentShipping\" tabindex=\"2\">\r\n              <label ng-click=\"cart.differentShipping = !cart.differentShipping\">Ship to different address?  </label>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <gi-address-form-fields item=\"cart.billingAddress\"\r\n                         model=\"model\"\r\n                         title=\"Please enter your billing address\"\r\n                         prefix=\"billing\"\r\n                         form=\"addressForm\"\r\n                         addresses=\"cart.addresses\"\r\n                         selectaddress=\"true\"\r\n                         options=\"billingAddressOptions\">\r\n        </gi-address-form-fields>\r\n\r\n        <div ng-if=\"cart.differentShipping\">\r\n          <gi-address-form-fields item=\"cart.shippingAddress\"\r\n                           model=\"model\"\r\n                           title=\"Please enter your shipping address\"\r\n                           prefix=\"shipping\"\r\n                           form=\"addressForm\"\r\n                           addresses=\"cart.addresses\"\r\n                           selectaddress=\"true\"\r\n                           options=\"shippingAddressOptions\">\r\n          </gi-address-form-fields>\r\n        </div>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.discountAdmin.html","<div class=\"container\">\r\n  <div class=\"row\">\r\n    <div class=\"col-md-4\">\r\n      <h3> Create a new Code </h3>\r\n      <label for=\"code\"> Discount Code Keyword: </label>\r\n      <input type=\"text\" class=\"form-control\" style=\"border-radius: 0;\"id=\"code\" ng-model=\"code.code\">\r\n\r\n      <label for=\"percent\" style=\"margin-top: 10px;\"> Discount Code Percentage: </label>\r\n      <input type=\"number\"  class=\"form-control\" style=\"border-radius: 0;\" id=\"percent\" ng-model=\"code.percent\">\r\n      <!-- <label for=\"sd\" style=\"margin-top: 10px;\"> Start Date: </label>\r\n      <input type=\"date\"  class=\"form-control\" style=\"border-radius: 0;\" id=\"sd\" ng-model=\"code.startDate\">\r\n      <label for=\"ed\" style=\"margin-top: 10px;\"> End Date: </label>\r\n      <input type=\"date\"  class=\"form-control\" style=\"border-radius: 0;\" id=\"ed\" ng-model=\"code.endDate\"> -->\r\n\r\n      <button style=\"margin-top: 10px; border-radius: 0;\" ng-click=\"create(code)\"class=\"btn btn-success form-control\"> Create </button>\r\n\r\n    </div>\r\n    <div class=\"col-md-8\" ng-if=\"selected\">\r\n      <h3> Edit Code </h3>\r\n      <label for=\"code\"> Discount Code Keyword: </label>\r\n      <input type=\"text\" class=\"form-control\" style=\"border-radius: 0;\"id=\"code\" ng-model=\"editCode.code\">\r\n\r\n      <label for=\"percent\" style=\"margin-top: 10px;\"> Discount Code Percentage: </label>\r\n      <input type=\"text\" class=\"form-control\" style=\"border-radius: 0;\"id=\"percent\" ng-model=\"editCode.percent\">\r\n      <!-- <label for=\"sd\" style=\"margin-top: 10px;\"> Start Date: </label>\r\n      <input type=\"date\"  class=\"form-control\" style=\"border-radius: 0;\" id=\"sd\" ng-model=\"editCode.startDate\">\r\n      <label for=\"ed\" style=\"margin-top: 10px;\"> End Date: </label>\r\n      <input type=\"date\"  class=\"form-control\" style=\"border-radius: 0;\" id=\"ed\" ng-model=\"editCode.endDate\"> -->\r\n\r\n      <button style=\"margin-top: 10px; border-radius: 0;\" ng-click=\"save(editCode)\"class=\"btn btn-success form-control\"> Save </button>\r\n\r\n\r\n    </div>\r\n  </div>\r\n  <div class=\"row\">\r\n    <div class=\"container\">\r\n      <h3> Current Codes </h3>\r\n      <table class=\"table table-striped\">\r\n        <tr>\r\n          <th>Keyword</th>\r\n          <th>Percentage</th>\r\n          <th>Active</th>\r\n          <th>Tools</th>\r\n\r\n        </tr>\r\n        <tr class=\"code-row\" ng-repeat=\"c in currentCodes\">\r\n          <td>{{c.code}}</td>\r\n          <td>{{c.percent}}</td>\r\n          <td>{{c.active}}</td>\r\n          <td><a ng-click=\"delete(c, $index)\"><i class=\"fa fa-trash-o del-code\" style=\"color: black\"></i></a><a style=\"margin-left: 20px\" ng-click=\"edit(c, index)\"><i style=\"color:black;\" class=\"fa fa-pencil edit-code\"></i></a></td>\r\n\r\n        </tr>\r\n      </table>\r\n    </div>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.discountForm.html","<div class=\"row\">\r\n    <div  class=\"col-md-12 col-xs-12\">\r\n      <form class=\"navbar-form navbar-left\" role=\"search\">\r\n        <label for=\"dc\"> Apply Discount Code (case sensitive)</label>\r\n\r\n        <div class=\"form-group\">\r\n\r\n          <input type=\"text\" id=\"dc\" class=\"form-control \"  ng-model=\"code\">\r\n        </div>\r\n        <button type=\"submit\" class=\"btn btn-primary btn-dc\" style=\"background: #2980b9; border: none;\" ng-click=\"checkCode(code)\">Submit</button>\r\n      </form>\r\n    </div>\r\n</div>\r\n</br>\r\n");
$templateCache.put("gi.commerce.marketForm.html","<div ng-form name=\"marketForm\" class=\"well form\">\r\n  <div class=\"form-group\">\r\n    <label>Name:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"marketName\"\r\n           ng-model=\"model.selectedItem.name\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label>Code:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"marketCode\"\r\n           ng-model=\"model.selectedItem.code\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label class=\"control-label\">Currency:</label>\r\n    <ui-select ng-model=\"model.selectedItem.currencyId\">\r\n      <ui-select-match>{{$select.selected.name}}</ui-select-match>\r\n      <ui-select-choices repeat=\"c._id as c in model.currencies  | filter: $select.search\">\r\n        <div ng-bind-html=\"c.name | highlight: $select.search\"></div>\r\n      </ui-select-choices>\r\n    </ui-select>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <div class=\"checkbox\">\r\n      <label>\r\n        <input type=\"checkbox\" ng-model=\"model.selectedItem.default\"> Use as Default Market?\r\n      </label>\r\n    </div>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <button class=\"form-control btn btn-primary btn-save-asset\"\r\n            ng-click=\"save()\">{{submitText}}</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"countryForm.$dirty || model.selectedItem._id\">\r\n    <button class=\"form-control btn btn-warning\"\r\n            ng-click=\"clear()\">Cancel</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"model.selectedItem._id\">\r\n    <button class=\"form-control btn btn-danger\" ng-click=\"destroy()\">\r\n      Delete <span ng-if=\"confirm\">- Are you sure? Click again to confirm</span>\r\n    </button>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.orderSummary.html","<div class = \"form-inline well hidden-sm hidden-xs\">\r\n  <div class=\"row\">\r\n    <div class=\"col-md-2\"></div>\r\n    <div class=\"col-md-8\">\r\n      <legend>Order Summary</legend>\r\n    </div>\r\n  </div>\r\n\r\n  <div class=\"row \">\r\n    <div class=\"col-md-2\">\r\n    </div>\r\n    <div class=\"col-md-4\">\r\n      <label class=\"order-summary\">Amount:</label>\r\n    </div>\r\n    <div class=\"col-md-4\">\r\n      <div class=\"pull-right\">\r\n        <label class=\"order-summary\">{{ cart.getSubTotal() | giCurrency:cart.getCurrencySymbol }}</label>\r\n      </div>\r\n    </div>\r\n  </div>\r\n  <div class=\"row\">\r\n    <div class=\"col-md-2\">\r\n    </div>\r\n    <div class=\"col-md-4\" ng-if=\"cart.hasDiscount()\">\r\n      <label class=\"order-summary\">Discount:</label>\r\n    </div>\r\n    <div class=\"col-md-4\" ng-if=\"cart.hasDiscount()\">\r\n      <div class=\"pull-right\">\r\n        <label class=\"order-summary\">({{ cart.discount() | giCurrency:cart.getCurrencySymbol }})</label>\r\n      </div>\r\n    </div>\r\n  </div>\r\n  <div class=\"row\">\r\n    <div class=\"col-md-2\">\r\n    </div>\r\n    <div class=\"col-md-4\" ng-if=\"cart.isTaxApplicable()\">\r\n      <label class=\"order-summary\">Tax:</label>\r\n    </div>\r\n    <div class=\"col-md-4\" ng-if=\"cart.isTaxApplicable()\">\r\n      <div class=\"pull-right\">\r\n        <label class=\"order-summary\">{{ cart.getTaxTotal() | giCurrency:cart.getCurrencySymbol }}</label>\r\n      </div>\r\n    </div>\r\n  </div>\r\n\r\n  <div class=\"row\">\r\n    <div class=\"col-md-2\">\r\n    </div>\r\n    <div class=\"col-md-4\">\r\n      <label>Total:</label>\r\n    </div>\r\n    <div class=\"col-md-4\">\r\n      <div class=\"pull-right\">\r\n        <label>{{ cart.totalCost() | giCurrency:cart.getCurrencySymbol }}</label>\r\n      </div>\r\n    </div>\r\n\r\n  </div>\r\n</div>\r\n<div class=\"visible-sm visible-xs\">\r\n  <div class = \"form-inline well\" style=\"height: 180px\">\r\n    <div class=\"row\">\r\n      <div class=\"col-md-2\">\r\n\r\n      </div>\r\n      <div class=\"col-md-8\">\r\n        <legend>Order Summary</legend>\r\n      </div>\r\n    </div>\r\n\r\n    <div style=\"margin-top: -10px;\">\r\n      <div class=\"col-xs-6\" >\r\n        <label style=\"font-weight: normal\" class=\"pull-right\">Amount:\r\n        </label>\r\n      </div>\r\n      <div  style=\"text-align: right\" class=\"col-xs-6\">\r\n        <label style=\"font-weight: normal\"><span class=\"\">{{ cart.getSubTotal() | giCurrency:cart.getCurrencySymbol }}</span></label>\r\n      </div>\r\n\r\n      <div class=\"col-xs-6\" ng-if=\"cart.hasDiscount()\">\r\n        <label class=\"pull-right\" style=\"font-weight: normal\">Discount:</label>\r\n      </div>\r\n      <div class=\"col-xs-6\" style=\"text-align: right;\" ng-if=\"cart.hasDiscount()\">\r\n          <label style=\"font-weight: normal\" >({{ cart.discount() | giCurrency:cart.getCurrencySymbol }})</label>      </div>\r\n    <div class=\"col-xs-6\" ng-if=\"cart.isTaxApplicable()\">\r\n      <label class=\"pull-right\" style=\"font-weight: normal\">Tax:\r\n      </label>\r\n    </div>\r\n    <div class=\"col-xs-6\" style=\"text-align: right;\" ng-if=\"cart.isTaxApplicable()\">\r\n      <label style=\"font-weight: normal\"><span class=\"pull-right\">{{ cart.getTaxTotal() | giCurrency:cart.getCurrencySymbol }}</span></label>\r\n    </div>\r\n    <div class=\"col-xs-6\">\r\n      <label class=\"pull-right\">Total:\r\n      </label>\r\n    </div>\r\n    <div style=\"text-align: right;\" class=\"col-xs-6\">\r\n      <label >{{ cart.totalCost() | giCurrency:cart.getCurrencySymbol }}</label>\r\n    </div>\r\n  </div>\r\n</div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.paymentInfo.html","<div class=\"row\">\r\n  <div class=\"col-xs-12\">\r\n    <span us-spinner=\"{radius:30, width:8, length: 16}\" spinner-key=\"gi-cart-spinner-1\"></span>\r\n    <div ng-form name=\"cardForm\" class=\"well form\">\r\n      <legend>Please enter your card details</legend>\r\n      <div id=\"card-element\"></div>\r\n    </div>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.priceForm.html","<div ng-form name=\"priceForm\" class=\"well form\">\r\n  <div class=\"form-group\">\r\n    <label>Name:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"priceListName\"\r\n           ng-model=\"model.selectedItem.name\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label>Call To Action Text:</label>\r\n    <input type=\"text\"\r\n           class=\"form-control\"\r\n           name=\"ctaText\"\r\n           ng-model=\"model.selectedItem.ctaText\"/>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <label>Prices:</label>\r\n    <div ng-repeat=\"(code, price) in model.selectedItem.prices\">\r\n      <div class=\"input-group\">\r\n         <div class=\"input-group-addon market\">{{code}}</div>\r\n         <input type=\"text\" class=\"form-control\" id=\"exampleInputAmount\" placeholder=\"Amount\" ng-model=\"model.selectedItem.prices[code]\"/>\r\n         <div class=\"input-group-addon\" ng-click=\"removePriceForMarket(code)\">  <span class=\"glyphicon glyphicon-trash\" aria-hidden=\"true\"></span></div>\r\n       </div>\r\n    </div>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <div class=\"input-group\">\r\n      <div class=\"input-group-addon market\" style=\"\">\r\n        <ui-select ng-model=\"local.code\">\r\n           <ui-select-match>{{$select.selected.code}}</ui-select-match>\r\n           <ui-select-choices repeat=\"c.code as c in model.markets  | filter: $select.search\">\r\n             <div ng-bind-html=\"c.code | highlight: $select.search\"></div>\r\n           </ui-select-choices>\r\n        </ui-select>\r\n      </div>\r\n      <input type=\"text\" class=\"form-control market-pick\" id=\"exampleInputAmount\" placeholder=\"Enter Amount\" ng-model=\"local.price\"/>\r\n      <div class=\"input-group-addon\" ng-click=\"savePriceForMarket(local.code)\">  <span class=\"glyphicon glyphicon-save\" aria-hidden=\"true\"></span></div>\r\n     </div>\r\n  </div>\r\n  <div class=\"form-group\">\r\n    <button class=\"form-control btn btn-success btn-save-asset\"\r\n            ng-click=\"save()\">{{submitText}}</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"priceForm.$dirty || model.selectedItem._id\">\r\n    <button class=\"form-control btn btn-warning\"\r\n            ng-click=\"clear()\">Cancel</button>\r\n  </div>\r\n  <div class=\"form-group\" ng-show=\"model.selectedItem._id\">\r\n    <button class=\"form-control btn btn-danger\" ng-click=\"destroy()\">\r\n      Delete <span ng-if=\"confirm\">- Are you sure? Click again to confirm</span>\r\n    </button>\r\n  </div>\r\n</div>\r\n");
$templateCache.put("gi.commerce.summary.html","<div class=\"row\">\r\n  <div class=\"col-xs-5\">\r\n    <span class=\"fa fa-shopping-cart fa-lg\"></span>\r\n  </div>\r\n  <div class=\"col-xs-7\">\r\n    <span class=\"badge\">{{ giCart.totalQuantity() }}</span>\r\n  </div>\r\n</div>\r\n");}]);
angular.module('gi.commerce').directive('giDiscountAdmin', [
  'giDiscountCode', function(giDiscountCode) {
    return {
      restrict: 'E',
      templateUrl: 'gi.commerce.discountAdmin.html',
      link: function($scope, elem, attrs) {
        $scope.selected = false;
        $scope.code = {};
        $scope.editCode = {};
        $scope.editIndex = '';
        giDiscountCode.all().then(function(data) {
          return $scope.currentCodes = data;
        });
        $scope.create = function(code) {
          code.active = 'Active';
          giDiscountCode.save(code);
          return $scope.code = {};
        };
        $scope["delete"] = function(code) {
          return giDiscountCode.destroy(code._id).then(function(data) {});
        };
        $scope.edit = function(code, index) {
          $scope.editIndex = index;
          $scope.selected = true;
          return $scope.editCode = angular.copy(code);
        };
        return $scope.save = function(code) {
          return giDiscountCode.save(code).then(function() {});
        };
      }
    };
  }
]);

angular.module('gi.commerce').directive('giDiscountForm', [
  'giDiscountCode', 'giCart', function(giDiscountCode, giCart) {
    return {
      restrict: 'E',
      templateUrl: 'gi.commerce.discountForm.html',
      link: function($scope, elem, attrs) {
        return $scope.checkCode = function(code) {
          return giCart.checkCode(code).then(function(percent) {
            var alert;
            if (percent > 0) {
              $scope.codePercent = percent;
              alert = {
                name: 'code-redeemed',
                type: 'success',
                msg: code + ' redeemed successfully'
              };
              return $scope.$emit('event:show-alert', alert);
            } else {
              alert = {
                name: 'code-invalid',
                type: 'danger',
                msg: 'You have entered an invalid code.'
              };
              return $scope.$emit('event:show-alert', alert);
            }
          }, function(err) {
            var alert;
            alert = {
              name: 'code-error',
              type: 'danger',
              msg: err
            };
            return $scope.$emit('event:show-alert', alert);
          });
        };
      }
    };
  }
]);

angular.module('gi.commerce').directive('giMarketForm', [
  '$q', 'giCrud', 'giMarket', function($q, Crud, Model) {
    return Crud.formDirectiveFactory('Market', Model);
  }
]);

angular.module('gi.commerce').directive('giOrderSummary', [
  'giCart', function(Cart) {
    return {
      restrict: 'E',
      templateUrl: 'gi.commerce.orderSummary.html',
      link: function($scope, elem, attrs) {
        return $scope.cart = Cart;
      }
    };
  }
]);

angular.module('gi.commerce').directive('giPaymentInfo', [
  '$window', 'giCart', 'giPayment', function($window, Cart, Payment) {
    return {
      restrict: 'E',
      templateUrl: 'gi.commerce.paymentInfo.html',
      scope: {
        model: '=',
        stage: '@'
      },
      link: function($scope, elem, attrs) {
        var scrollToTop;
        $scope.cart = Cart;
        Cart.sendCart('Viewed Card Details');
        Payment.stripe.mountElement('#card-element', Cart);
        $scope.getCreditFont = function() {
          switch ($scope.cardForm.cardNumber.$giCcEagerType) {
            case "Visa":
              return "fa-cc-visa";
            case "MasterCard":
              return "fa-cc-mastercard";
            default:
              return "fa-credit-card";
          }
        };
        $scope.getPropertyFont = function(prop) {
          if ($scope.cardForm[prop].$touched) {
            if ($scope.cardForm[prop].$invalid) {
              return "fa-exclamation-circle";
            } else {
              return "fa-check-circle";
            }
          } else {
            return "";
          }
        };
        $scope.isPropertyValidationError = function(prop) {
          return $scope.cardForm[prop].$invalid && $scope.cardForm[prop].$touched && $scope.cardForm[prop].$dirty;
        };
        $scope.isPropertyValidationSuccess = function(prop) {
          return $scope.cardForm[prop].$valid && $scope.cardForm[prop].$touched && $scope.cardForm[prop].$dirty;
        };
        $scope.isPayNowEnabled = function() {
          return $scope.cardForm.$valid;
        };

        /*
        $scope.$watch 'cardForm.$valid', (valid) ->
          $scope.cart.setStageValidity($scope.stage, valid)
         */
        scrollToTop = function() {
          return $window.scrollTo(0, 0);
        };
        return scrollToTop();
      }
    };
  }
]);

angular.module('gi.commerce').directive('giPaymentThanks', [
  '$compile', 'giCart', function($compile, Cart) {
    return {
      restrict: 'E',
      link: function($scope, elem, attrs) {
        var el, thanks;
        thanks = angular.element(document.createElement(Cart.thankyouDirective));
        el = $compile(thanks)($scope);
        elem.append(el);
        Cart.sendCart('Attempted Payment');
      }
    };
  }
]);

angular.module('gi.commerce').directive('giPriceForm', [
  '$q', 'giPriceList', function($q, PriceList) {
    return {
      restrict: 'E',
      scope: {
        submitText: '@',
        model: '='
      },
      templateUrl: 'gi.commerce.priceForm.html',
      link: {
        pre: function($scope) {
          $scope.local = {};
          $scope.savePriceForMarket = function(code) {
            if ($scope.model.selectedItem != null) {
              if ($scope.model.selectedItem.prices == null) {
                $scope.model.selectedItem.prices = {};
              }
              $scope.model.selectedItem.prices[code] = $scope.local.price;
              return $scope.local = {};
            }
          };
          $scope.removePriceForMarket = function(code) {
            var ref;
            if (((ref = $scope.model.selectedItem) != null ? ref.prices : void 0) != null) {
              return delete $scope.model.selectedItem.prices[code];
            }
          };
          $scope.save = function() {
            $scope.model.selectedItem.acl = "public-read";
            return PriceList.save($scope.model.selectedItem).then(function() {
              var alert;
              alert = {
                name: 'price-saved',
                type: 'success',
                msg: "Price Saved."
              };
              $scope.$emit('event:show-alert', alert);
              $scope.$emit('price-saved', $scope.model.selectedItem);
              return $scope.clear();
            }, function(err) {
              var alert;
              alert = {
                name: 'price-not-saved',
                type: 'danger',
                msg: "Failed to save price. " + err.data.error
              };
              return $scope.$emit('event:show-alert', alert);
            });
          };
          $scope.clear = function() {
            $scope.model.selectedItem = {};
            $scope.priceForm.$setPristine();
            $scope.confirm = false;
            return $scope.$emit('price-form-cleared');
          };
          return $scope.destroy = function() {
            if ($scope.confirm) {
              return PriceList.destroy($scope.model.selectedItem._id).then(function() {
                var alert;
                alert = {
                  name: 'price-deleted',
                  type: 'success',
                  msg: 'price Deleted.'
                };
                $scope.$emit('event:show-alert', alert);
                $scope.$emit('price-deleted');
                return $scope.clear();
              }, function() {
                var alert;
                alert = {
                  name: "Price not deleted",
                  msg: "Price not deleted.",
                  type: "warning"
                };
                $scope.$emit('event:show-alert', alert);
                return $scope.confirm = false;
              });
            } else {
              return $scope.confirm = true;
            }
          };
        }
      }
    };
  }
]);

angular.module('gi.security').directive('giVat', [
  '$q', '$parse', '$http', 'giCart', function($q, $parse, $http, Cart) {
    return {
      restrict: 'A',
      require: 'ngModel',
      compile: function(elem, attrs) {
        var linkFn;
        linkFn = function($scope, elem, attrs, controller) {
          return controller.$asyncValidators.giVat = function(modelValue, viewValue) {
            var deferred;
            deferred = $q.defer();
            if ((viewValue == null) || viewValue === "") {
              deferred.resolve();
            } else {
              Cart.calculateTaxRate(viewValue).then(function() {
                if (Cart.isTaxExempt()) {
                  return deferred.resolve();
                } else {
                  return deferred.reject();
                }
              }, function(error) {
                return deferred.reject();
              });
            }
            return deferred.promise;
          };
        };
        return linkFn;
      }
    };
  }
]);

angular.module('gi.commerce').factory('Address', [
  'giCrud', function(Crud) {
    return Crud.factory('Addresses');
  }
]);

angular.module('gi.commerce').factory('giCard', [
  'giCardType', function(CardType) {
    var camelCase, card, cardTypes, cvcRegex, isCvcValid;
    cardTypes = CardType;
    camelCase = function(input) {
      return input.replace(/\s/g, '-').toLowerCase().replace(/-(.)/g, function(match, group1) {
        return group1.toUpperCase();
      });
    };
    card = {
      types: cardTypes,
      parse: function(number) {
        if (typeof number !== 'string') {
          return '';
        } else {
          return number.replace(/[^\d]/g, '');
        }
      },
      type: function(number, eager) {
        var name, res, type;
        res = null;
        for (name in CardType) {
          type = CardType[name];
          if (type.test(number, eager)) {
            res = type.name;
            break;
          }
        }
        return res;
      },
      luhn: function(number) {
        var len, mul, prodArr, sum;
        if (number == null) {
          return false;
        }
        len = number.length;
        if (len < 13) {
          return false;
        }
        mul = 0;
        prodArr = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 2, 4, 6, 8, 1, 3, 5, 7, 9]];
        sum = 0;
        while (len--) {
          sum += prodArr[mul][parseInt(number.charAt(len), 10)];
          mul ^= 1;
        }
        return (sum % 10 === 0) && (sum > 0);
      },
      isValid: function(number, type) {
        if (type == null) {
          return this.luhn(number) && this.type(number);
        } else {
          type = this.types[type];
          if (type != null) {
            return ((!type.luhn) || luhn(number)) && type.test(number);
          } else {
            return false;
          }
        }
      }
    };
    cvcRegex = /^\d{3,4}$/;
    isCvcValid = function(cvc, type) {
      var camelType;
      if ((typeof cvc) !== 'string') {
        return false;
      } else if (!cvcRegex.test(cvc)) {
        return false;
      } else if (!type) {
        return true;
      } else {
        camelType = camelCase(type);
        if (cardTypes[camelType] != null) {
          return card.types[camelType].cvcLength === cvc.length;
        } else {
          return cvc.length === 3;
        }
      }
    };
    return {
      card: card,
      cvc: {
        isValid: isCvcValid
      },
      validate: function(cardObj) {
        return {
          card: {
            type: type(cardObj.number),
            number: cardObj.number,
            expirationMonth: cardObj.expirationMonth,
            expirationYear: cardObj.expirationYear,
            cvc: cardObj.cvc
          },
          validCardNumber: luhn(cardObj.number),
          validCvc: isCvcValid(cardObj.cvc)
        };
      }
    };
  }
]);

var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

angular.module('gi.commerce').factory('giCardType', [
  function() {
    var CardType, amex, dinersClub, discover, jcb, masterCard, unionPay, visa;
    CardType = (function() {
      function CardType(name, pattern, eagerPattern, cvcLength) {
        this.name = name;
        this.pattern = pattern;
        this.eagerPattern = eagerPattern;
        this.cvcLength = cvcLength;
        this.test = bind(this.test, this);
      }

      CardType.prototype.luhn = true;

      CardType.prototype.test = function(number, eager) {
        if (eager != null) {
          return this.eagerPattern.test(number);
        } else {
          return this.pattern.test(number);
        }
      };

      return CardType;

    })();
    visa = new CardType('Visa', /^4[0-9]{12}(?:[0-9]{3})?$/, /^4/, 3);
    masterCard = new CardType('MasterCard', /^5[1-5][0-9]{14}$/, /^5/, 3);
    amex = new CardType('American Express', /^3[47][0-9]{13}$/, /^3[47]/, 4);
    dinersClub = new CardType('Diners Club', /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/, /^3(?:0|[68])/, 3);
    discover = new CardType('Discover', /^6(?:011|5[0-9]{2})[0-9]{12}$/, /^6/, 3);
    jcb = new CardType('JCB', /^35\d{14}$/, /^35/, 3);
    unionPay = new CardType('UnionPay', /^62[0-5]\d{13,16}$/, /^62/, 3);
    unionPay.luhn = false;
    return {
      visa: visa,
      masterCard: masterCard,
      americanExpress: amex,
      dinersClub: dinersClub,
      discover: discover,
      jcb: jcb,
      unionPay: unionPay
    };
  }
]);

angular.module('gi.commerce').provider('giCart', function() {
  var thankyouDirective;
  thankyouDirective = "";
  this.setThankyouDirective = function(d) {
    return thankyouDirective = d;
  };
  this.$get = [
    '$q', '$rootScope', '$http', 'giCartItem', 'giLocalStorage', 'giCountry', 'giCurrency', 'giPayment', 'giMarket', 'giUtil', '$window', 'giEcommerceAnalytics', 'giDiscountCode', '$injector', '$timeout', function($q, $rootScope, $http, giCartItem, store, Country, Currency, Payment, Market, Util, $window, giEcommerceAnalytics, Discount, $injector, $timeout) {
      var c, calculateTaxRate, cart, getItemById, getPricingInfo, getSubTotal, getTaxTotal, init, save;
      cart = {};
      getPricingInfo = function() {
        return {
          marketCode: cart.market.code,
          taxRate: cart.tax,
          taxInclusive: cart.taxInclusive,
          taxExempt: cart.taxExempt
        };
      };
      getItemById = function(itemId) {
        var build;
        build = null;
        angular.forEach(cart.items, function(item) {
          if (item.getId() === itemId) {
            return build = item;
          }
        });
        return build;
      };
      getSubTotal = function() {
        var priceInfo, subTotal;
        subTotal = 0;
        priceInfo = getPricingInfo();
        angular.forEach(cart.items, function(item) {
          return subTotal += item.getSubTotal(priceInfo);
        });
        return +subTotal.toFixed(2);
      };
      getTaxTotal = function() {
        var priceInfo, taxSavings, taxTotal;
        taxTotal = 0;
        priceInfo = getPricingInfo();
        angular.forEach(cart.items, function(item) {
          return taxTotal += item.getTaxTotal(priceInfo);
        });
        taxSavings = taxTotal * (cart.discountPercent / 100);
        taxTotal = taxTotal - taxSavings;
        return +taxTotal.toFixed(2);
      };
      init = function() {
        cart = {
          tax: null,
          taxName: "",
          taxExempt: false,
          items: [],
          stage: 1,
          paymentType: 1,
          validStages: {},
          isValid: true,
          country: {
            code: 'GB'
          },
          currency: {
            code: 'GBP',
            symbol: '£'
          },
          market: {
            code: 'UK'
          },
          company: {},
          taxInclusive: true,
          taxApplicable: false,
          discountPercent: 0,
          checkoutFormValid: false,
          cardElementValid: false
        };
      };
      save = function() {
        return store.set('cart', cart);
      };
      calculateTaxRate = function(code) {
        var countryCode, deferred, ref, uri, vatNumber;
        vatNumber = code || ((ref = c.company) != null ? ref.VAT : void 0);
        deferred = $q.defer();
        countryCode = cart.country.code;
        uri = '/api/taxRate?countryCode=' + countryCode;
        $http.get(uri).success(function(data) {
          var exp, match, ref1;
          cart.tax = data.rate;
          cart.taxName = data.name;
          cart.taxApplicable = data.rate > 0;
          if ((cart.tax > 0) && (vatNumber != null)) {
            exp = Util.vatRegex;
            match = exp.exec(vatNumber);
            if (match != null) {
              uri = '/api/taxRate?countryCode=' + match[1];
              uri += '&vatNumber=' + match[0];
            }
            if (((ref1 = c.billingAddress) != null ? ref1.code : void 0) != null) {
              uri += '&postalCode=' + c.billingAddress.code;
            }
            return $http.get(uri).success(function(exemptionData) {
              cart.taxExempt = (data.name != null) && (exemptionData.rate === 0);
              return deferred.resolve(exemptionData);
            }).error(function(err) {
              return deferred.resolve(data);
            });
          } else {
            return deferred.resolve(data);
          }
        }).error(function(err) {
          console.log('error getting tax rate');
          cart.tax = -1;
          cart.taxName = "";
          cart.taxExempt = false;
          cart.taxApplicable = false;
          return deferred.reject(err);
        });
        return deferred.promise;
      };
      c = {
        init: init,
        checkCode: function(code) {
          var deferred, uri;
          deferred = $q.defer();
          cart.discountPercent = 0;
          if ((code != null) && code !== '') {
            uri = '/api/discountCodes/my/' + code;
            $http.get(uri).success(function(data, status) {
              if (data != null) {
                cart.discountPercent = data.percent;
              }
              return deferred.resolve(cart.discountPercent);
            }).error(function(data) {
              return deferred.reject('Could not check code');
            });
          } else {
            deferred.reject('No code supplied');
          }
          return deferred.promise;
        },
        addItem: function(id, name, priceList, quantity, data) {
          var inCart, newItem;
          inCart = getItemById(id);
          if (angular.isObject(inCart)) {
            inCart.setQuantity(quantity, false);
          } else {
            newItem = new giCartItem(id, name, priceList, quantity, data);
            cart.items.push(newItem);
            $rootScope.$broadcast('giCart:itemAdded', newItem);
          }
          return $rootScope.$broadcast('giCart:change', {});
        },
        setTaxRate: function(tax) {
          return cart.tax = tax;
        },
        getTaxRate: function() {
          if (cart.tax >= 0) {
            return cart.tax;
          } else {
            return -1;
          }
        },
        isTaxApplicable: function() {
          return cart.taxApplicable;
        },
        getDiscount: function() {
          return cart.discountPercent;
        },
        isTaxExempt: function() {
          return cart.taxExempt;
        },
        taxName: function() {
          return cart.taxName;
        },
        setTaxInclusive: function(isInclusive) {
          return cart.taxInclusive = isInclusive;
        },
        getSubTotal: getSubTotal,
        getTaxTotal: getTaxTotal,
        getItems: function() {
          return cart.items;
        },
        getStage: function() {
          return cart.stage;
        },
        nextStage: function() {
          if (cart.stage < 4) {
            return cart.stage += 1;
          }
        },
        prevStage: function() {
          if (cart.stage > 1) {
            return cart.stage -= 1;
          }
        },
        setStage: function(stage) {
          if (stage > 0 && stage < 4) {
            return cart.stage = stage;
          }
        },
        getPaymentType: function() {
          return cart.paymentType;
        },
        setPaymentType: function(paymentType) {
          return cart.paymentType = paymentType;
        },
        setStageValidity: function(stage, valid) {
          return cart.validStages[stage] = valid;
        },
        setValidity: function(valid) {
          return cart.isValid = valid;
        },
        setCheckoutFormValidity: function(valid) {
          return cart.checkoutFormValid = valid;
        },
        setCardElementValidity: function(valid) {
          return cart.cardElementValid = valid;
        },
        isStageInvalid: function(stage) {
          if (cart.validStages[stage] != null) {
            return !(cart.isValid && cart.validStages[stage]);
          } else {
            return !cart.isValid;
          }
        },
        isCheckoutFormInvalid: function() {
          return !cart.checkoutFormValid || !cart.cardElementValid;
        },
        getCurrencySymbol: function() {
          return cart.currency.symbol;
        },
        getCurrencyCode: function() {
          return cart.currency.code;
        },
        getCountryCode: function() {
          return cart.country.code;
        },
        getPricingInfo: getPricingInfo,
        saveAddress: function(address) {
          var required;
          address.userId = this.customer._id;
          required = ((address.line1 != null) && (address.line1 !== "")) || ((address.city != null) && (address.line2 !== "")) || ((address.postCode != null) && (address.postCode !== ""));
          if (required) {
            if (address._id != null) {
              return $http.put('/api/addresses/' + address._id, address);
            } else {
              return $http.post('/api/addresses/', address);
            }
          }
        },
        setCustomer: function(customer) {
          this.customer = customer;
          if ((this.billingAddress != null) && (this.billingAddress._id == null)) {
            this.saveAddress(this.billingAddress);
          }
          if (this.shippingAddress && (this.shippingAddress._id == null)) {
            return this.saveAddress(this.shippingAddress);
          }
        },
        getLastPurchase: function() {
          return cart.lastPurchase;
        },
        thankyouDirective: thankyouDirective,
        setCountry: function(code) {
          return Currency.all().then(function() {
            return Market.all().then(function(markets) {
              return Country.getFromCode(code).then(function(country) {
                if (country != null) {
                  cart.country = country;
                  cart.market = Market.getCached(cart.country.marketId);
                  cart.currency = Currency.getCached(cart.market.currencyId);
                  return calculateTaxRate();
                }
              });
            });
          });
        },
        calculateTaxRate: calculateTaxRate,
        needsShipping: function() {
          var result;
          result = false;
          angular.forEach(cart.items, function(item) {
            if (item.needsShipping()) {
              return result = true;
            }
          });
          return result;
        },
        totalItems: function() {
          return cart.items.length;
        },
        totalQuantity: function() {
          var result;
          result = 0;
          angular.forEach(cart.items, function(item) {
            return result += item._quantity;
          });
          return result;
        },
        totalCost: function() {
          var percentage, subTot, tot;
          percentage = cart.discountPercent / 100;
          subTot = getSubTotal();
          tot = getSubTotal() + getTaxTotal();
          cart.savings = percentage * subTot;
          return tot - (percentage * subTot);
        },
        discount: function() {
          return cart.savings;
        },
        hasDiscount: function() {
          if (cart.savings) {
            return true;
          } else {
            return false;
          }
        },
        removeItem: function(index) {
          cart.items.splice(index, 1);
          $rootScope.$broadcast('giCart:itemRemoved', {});
          return $rootScope.$broadcast('giCart:change', {});
        },
        continueShopping: function() {
          return $window.history.back();
        },
        stopSpinner: function() {
          $injector.get('usSpinnerService').stop('gi-cart-spinner-1');
          return this.setValidity(true);
        },
        wrapSpinner: function() {
          this.setValidity(false);
          return $injector.get('usSpinnerService').spin('gi-cart-spinner-1');
        },
        checkAccount: function() {
          var onPreparePayment, onSubmitInvoice, that;
          that = this;
          onPreparePayment = function() {
            that.wrapSpinner();
            return that.preparePayment(cart, function(client_secret) {
              cart.client_secret = client_secret;
              cart.stage += 1;
              return that.stopSpinner();
            });
          };
          onSubmitInvoice = function() {
            that.wrapSpinner();
            return that.submitInvoice(cart);
          };
          if (this.customerInfo && (!this.customer)) {
            $rootScope.$on('event:auth-login-complete', function(e, me) {
              console.log('event:auth-login-complete: ', e);
              that.setCustomer(me);
              if (cart.paymentType === 2) {
                return onSubmitInvoice();
              } else {
                return onPreparePayment();
              }
            });
            $rootScope.$broadcast('giCart:accountRequired', this.customerInfo);
          }
          if (this.billingAddress && this.customer) {
            this.saveAddress(this.billingAddress);
          }
          if (this.shippingAddress && this.customer) {
            this.saveAddress(this.shippingAddress);
          }
          if (cart.stage === 2) {
            if (this.customerInfo && this.customer) {
              if (cart.paymentType === 2) {
                return onSubmitInvoice();
              } else {
                return onPreparePayment();
              }
            }
          } else {
            return cart.stage += 1;
          }
        },
        handleSubscriptionRequest: function() {
          var deferred, that;
          that = this;
          deferred = $q.defer();
          that.submitUserInfo().then(function() {
            return that.subscribeNow().then(function() {
              return deferred.resolve();
            }, function(subscriptionErr) {
              return deferred.reject(subscriptionErr);
            });
          }, function(registrationErr) {
            return deferred.reject(registrationErr);
          });
          return deferred.promise;
        },
        submitUserInfo: function() {
          var deferred, that, userRegistrationRequired;
          that = this;
          deferred = $q.defer();
          userRegistrationRequired = false;
          if (this.customerInfo && (!this.customer)) {
            userRegistrationRequired = true;
            $rootScope.$on('event:auth-login-complete', function(e, me) {
              that.setCustomer(me);
              return deferred.resolve();
            });
            $rootScope.$broadcast('giCart:accountRequired', this.customerInfo);
          }
          if (this.billingAddress && this.customer) {
            this.saveAddress(this.billingAddress);
          }
          if (this.shippingAddress && this.customer) {
            this.saveAddress(this.shippingAddress);
          }
          if (!userRegistrationRequired) {
            deferred.resolve();
          }
          return deferred.promise;
        },
        saveCardElement: function(el) {
          return cart.cardElement = el;
        },
        getCardElement: function() {
          return cart.cardElement;
        },
        payNow: function() {
          var deferred, stripeIns, that;
          that = this;
          deferred = $q.defer();
          console.log(that.customer);
          if (cart.client_secret && cart.cardElement) {
            stripeIns = Payment.stripe.getStripeInstance();
            stripeIns.handleCardPayment(cart.client_secret, cart.cardElement).then(function(result) {
              console.log(result.paymentIntent);
              if (result.paymentIntent) {
                $rootScope.$broadcast('giCart:paymentCompleted');
                giEcommerceAnalytics.sendTransaction({
                  step: 4,
                  option: 'Transaction Complete'
                }, cart.items);
                console.log(result.paymentIntent);
                that.nextStage();
                that.empty();
                return deferred.resolve();
              } else {
                if (result.error) {
                  $rootScope.$broadcast('giCart:paymentFailed', result.error);
                }
                return deferred.reject();
              }
            });
          }
          return deferred.promise;
        },
        subscribeNow: function() {
          var deferred, stripeIns, that;
          that = this;
          deferred = $q.defer();
          if (that.customer && cart.cardElement) {
            stripeIns = Payment.stripe.getStripeInstance();
            stripeIns.createPaymentMethod({
              type: 'card',
              card: cart.cardElement,
              billing_details: {
                email: that.customer.email
              }
            }).then(function(result) {
              if (result.paymentMethod) {
                return that.submitSubscriptionRequest(result.paymentMethod).then(function() {
                  $rootScope.$broadcast('giCart:paymentCompleted');
                  giEcommerceAnalytics.sendTransaction({
                    step: 4,
                    option: 'Transaction Complete'
                  }, cart.items);
                  return that.waitForAsset().then(function() {
                    that.empty();
                    that.redirectUser();
                    return deferred.resolve();
                  }, function(err) {
                    that.empty();
                    $rootScope.$broadcast('giCart:paymentFailed', "An error occurred with the automatic redirect, please open the welcome page manually.");
                    return deferred.reject();
                  });
                }, function(data) {
                  $rootScope.$broadcast('giCart:paymentFailed', data);
                  return deferred.reject();
                });
              } else {
                if (result.error) {
                  $rootScope.$broadcast('giCart:paymentFailed', result.error);
                }
                return deferred.reject();
              }
            });
          }
          return deferred.promise;
        },
        submitSubscriptionRequest: function(paymentMethod) {
          var deferred, item, stripeIns, subscriptionRequest, that;
          that = this;
          stripeIns = Payment.stripe.getStripeInstance();
          deferred = $q.defer();
          subscriptionRequest = {
            marketCode: cart.market.code,
            customer: that.customer,
            paymentMethod: paymentMethod.id,
            total: that.totalCost(),
            billing: that.billingAddress,
            customer: that.customer,
            currency: that.getCurrencyCode().toLowerCase(),
            tax: {
              rate: cart.tax,
              name: cart.taxName
            },
            items: (function() {
              var i, len, ref, results;
              ref = cart.items;
              results = [];
              for (i = 0, len = ref.length; i < len; i++) {
                item = ref[i];
                results.push({
                  id: item._data._id,
                  name: item._data.name,
                  purchaseType: item._data.purchaseType
                });
              }
              return results;
            })()
          };
          $http.post('/api/createSubscription', subscriptionRequest).success(function(subscription) {
            var clientSecret, latestInvoice, paymentIntent, status;
            latestInvoice = subscription.latest_invoice;
            paymentIntent = latestInvoice.payment_intent;
            if (paymentIntent) {
              clientSecret = paymentIntent.client_secret;
              status = paymentIntent.status;
              if (status === 'requires_action') {
                return stripeIns.confirmCardPayment(clientSecret).then(function(result) {
                  if (result.error) {
                    return deferred.reject(result.error);
                  } else {
                    return deferred.resolve();
                  }
                });
              } else {
                return deferred.resolve();
              }
            } else {
              return deferred.resolve();
            }
          }).error(function(data) {
            return deferred.reject(data);
          });
          return deferred.promise;
        },
        waitForAsset: function() {
          var deferred, hasSubscription, that;
          that = this;
          deferred = $q.defer();
          hasSubscription = false;
          that.requestUserSubscriptionInfo().then(function(response) {
            if (response.data) {
              return deferred.resolve();
            } else {
              return $timeout((function() {
                return that.waitForAsset().then(function() {
                  return deferred.resolve();
                }, function(err) {
                  return deferred.reject(err);
                });
              }), 1000);
            }
          }, function(err) {
            return deferred.reject(err);
          });
          return deferred.promise;
        },
        requestUserSubscriptionInfo: function() {
          return $http.get('/api/assets/has-subscription');
        },
        redirectUser: function() {
          return $window.location.href = "/a/content";
        },
        preparePayment: function(cart, callback) {
          var chargeRequest, exp, item, match, that, uri;
          that = this;
          chargeRequest = {
            total: that.totalCost(),
            billing: that.billingAddress,
            shipping: that.shippingAddress,
            customer: that.customer,
            currency: that.getCurrencyCode().toLowerCase(),
            tax: {
              rate: cart.tax,
              name: cart.taxName
            },
            items: (function() {
              var i, len, ref, results;
              ref = cart.items;
              results = [];
              for (i = 0, len = ref.length; i < len; i++) {
                item = ref[i];
                results.push({
                  id: item._data._id,
                  name: item._data.name,
                  purchaseType: item._data.purchaseType
                });
              }
              return results;
            })()
          };
          if (that.company != null) {
            chargeRequest.company = that.company;
            exp = Util.vatRegex;
            match = exp.exec(that.company.VAT);
            if (match != null) {
              uri = '/api/taxRate?countryCode=' + match[1];
              uri += '&vatNumber=' + match[0];
              return $http.get(uri).success(function(exemptionData) {
                chargeRequest.tax.rate = (exemptionData != null ? exemptionData.rate : void 0) || 0;
                chargeRequest.tax.name = exemptionData != null ? exemptionData.name : void 0;
                return that.makeIntent(chargeRequest, that, callback);
              }).error(function(err) {
                return $rootScope.$broadcast('giCart:paymentFailed', err);
              });
            } else {
              return that.makeIntent(chargeRequest, that, callback);
            }
          } else {
            return that.makeIntent(chargeRequest, that, callback);
          }
        },
        submitInvoice: function(cart, callback) {
          var chargeRequest, exp, item, match, that, uri;
          that = this;
          chargeRequest = {
            total: that.totalCost(),
            billing: that.billingAddress,
            shipping: that.shippingAddress,
            customer: that.customer,
            currency: that.getCurrencyCode().toLowerCase(),
            tax: {
              rate: cart.tax,
              name: cart.taxName
            },
            items: (function() {
              var i, len, ref, results;
              ref = cart.items;
              results = [];
              for (i = 0, len = ref.length; i < len; i++) {
                item = ref[i];
                results.push({
                  id: item._data._id,
                  name: item._data.name,
                  purchaseType: item._data.purchaseType
                });
              }
              return results;
            })()
          };
          if (that.company != null) {
            chargeRequest.company = that.company;
            exp = Util.vatRegex;
            match = exp.exec(that.company.VAT);
            if (match != null) {
              uri = '/api/taxRate?countryCode=' + match[1];
              uri += '&vatNumber=' + match[0];
              $http.get(uri).success(function(exemptionData) {
                chargeRequest.tax.rate = (exemptionData != null ? exemptionData.rate : void 0) || 0;
                return chargeRequest.tax.name = exemptionData != null ? exemptionData.name : void 0;
              }).error(function(err) {
                $rootScope.$broadcast('giCart:paymentFailed', err);
              });
            }
          }
          return $http.post('/api/submitInvoice', chargeRequest).success(function() {
            that.empty();
            cart.stage += 2;
            return that.stopSpinner();
          }).error(function(data) {
            var msg;
            msg = 'Invoice submission could not completed';
            if (data.message != null) {
              msg = data.message;
            }
            $rootScope.$broadcast('giCart:paymentFailed', msg);
            return that.stopSpinner();
          });
        },
        makeIntent: function(chargeRequest, that, callback) {
          return Payment.stripe.createIntent(chargeRequest).then(function(client_secret) {
            $rootScope.$broadcast('giCart:paymentPrepared');
            return callback(client_secret);
          }, function(err) {
            return $rootScope.$broadcast('giCart:paymentFailed', err);
          });
        },
        makeCharge: function(chargeRequest, that) {
          return Payment.stripe.charge(chargeRequest).then(function(result) {
            $rootScope.$broadcast('giCart:paymentCompleted');
            giEcommerceAnalytics.sendTransaction({
              step: 4,
              option: 'Transaction Complete'
            }, cart.items);
            that.empty();
            return cart.stage = 4;
          }, function(err) {
            return $rootScope.$broadcast('giCart:paymentFailed', err);
          });
        },
        empty: function() {
          this.billingAddress = {};
          this.shippingAddress = {};
          this.customerInfo = {};
          this.card = {};
          this.company = {};
          cart.lastPurchase = cart.items.slice(0);
          cart.items = [];
          return localStorage.removeItem('cart');
        },
        save: save,
        sendCart: function(opt) {
          return giEcommerceAnalytics.sendCartView({
            step: cart.stage,
            option: opt
          }, cart.items);
        },
        restore: function(storedCart) {
          init();
          cart.tax = storedCart.tax;
          angular.forEach(storedCart.items, function(item) {
            return cart.items.push(new giCartItem(item._id, item._name, item._priceList, item._quantity, item._data));
          });
          return save();
        }
      };
      return c;
    }
  ];
  return this;
});

angular.module('gi.commerce').factory('giCartItem', [
  '$rootScope', 'giLocalStorage', function($rootScope, store) {
    var item;
    item = function(id, name, priceList, quantity, data) {
      this.setId(id);
      this.setName(name);
      this.setPriceList(priceList);
      this.setQuantity(quantity);
      return this.setData(data);
    };
    item.prototype.setId = function(id) {
      if (id) {
        return this._id = id;
      } else {
        return console.error('An ID must be provided');
      }
    };
    item.prototype.getId = function() {
      return this._id;
    };
    item.prototype.setName = function(name) {
      if (name) {
        return this._name = name;
      } else {
        return console.error('A name must be provided');
      }
    };
    item.prototype.getName = function() {
      return this._name;
    };
    item.prototype.setPriceList = function(priceList) {
      if (priceList != null) {
        return this._priceList = priceList;
      } else {
        return console.error('A Price List must be provided');
      }
    };
    item.prototype.getPrice = function(priceInfo) {
      var marketCode, ref, ref1;
      marketCode = priceInfo.marketCode;
      if (((ref = this._priceList) != null ? (ref1 = ref.prices) != null ? ref1[marketCode] : void 0 : void 0) != null) {
        return this._priceList.prices[marketCode];
      } else {
        return 0;
      }
    };
    item.prototype.setQuantity = function(quantity, relative) {
      quantity = parseInt(quantity);
      if (quantity % 1 === 0) {
        if (relative === true) {
          this._quantity += quantity;
        } else {
          this._quantity = quantity;
        }
        if (this._quantity < 1) {
          this._quantity = 1;
        }
      } else {
        this._quantity = 1;
        console.info('Quantity must be an integer and was defaulted to 1');
      }
      return $rootScope.$broadcast('giCart:change', {});
    };
    item.prototype.getQuantity = function() {
      return this._quantity;
    };
    item.prototype.setData = function(data) {
      if (data) {
        this._data = data;
      }
    };
    item.prototype.getData = function() {
      if (this._data != null) {
        return this._data;
      } else {
        console.info('This item has no data');
      }
    };
    item.prototype.getSubTotal = function(priceInfo) {
      var itemPrice;
      itemPrice = this.getPrice(priceInfo);
      if (priceInfo.taxRate > 0 && priceInfo.taxInclusive) {
        itemPrice = itemPrice / (1 + (priceInfo.taxRate / 100));
      }
      return +(this.getQuantity() * itemPrice).toFixed(2);
    };
    item.prototype.getTaxTotal = function(priceInfo) {
      var itemPrice, taxTotal;
      if (priceInfo.taxRate > 0 && !priceInfo.taxExempt) {
        itemPrice = this.getPrice(priceInfo);
        taxTotal = 0;
        if (priceInfo.taxInclusive) {
          taxTotal = itemPrice - (itemPrice / (1 + (priceInfo.taxRate / 100)));
        } else {
          taxTotal = itemPrice * (priceInfo.taxRate / 100);
        }
        return +(this.getQuantity() * taxTotal).toFixed(2);
      } else {
        return 0;
      }
    };
    item.prototype.getTotal = function(priceInfo) {
      return this.getSubTotal(priceInfo) + this.getTaxTotal(priceInfo);
    };
    item.prototype.needsShipping = function() {
      return this._data.physical;
    };
    return item;
  }
]);

angular.module('gi.commerce').factory('giCountry', [
  '$filter', 'giCrud', function($filter, Crud) {
    var crud, getDefault, getFromCode;
    crud = Crud.factory('country');
    getFromCode = function(code) {
      return crud.all().then(function(countries) {
        var countryCode, temp;
        countryCode = code.toUpperCase();
        temp = $filter('filter')(countries, function(country) {
          return country.code === countryCode;
        });
        if (temp.length > 0) {
          return temp[0];
        } else {
          return getDefault();
        }
      });
    };
    getDefault = function() {
      return crud.all().then(function(countries) {
        var result, temp;
        result = null;
        temp = $filter('filter')(countries, function(country) {
          return country["default"];
        });
        if (temp.length > 0) {
          result = temp[0];
        }
        return result;
      });
    };
    crud.getDefault = getDefault;
    crud.getFromCode = getFromCode;
    return crud;
  }
]);

angular.module('gi.commerce').factory('giCurrency', [
  '$filter', 'giCrud', 'giCountry', function($filter, Crud, Country) {
    return Crud.factory('currency');
  }
]);

angular.module('gi.commerce').factory('giDiscountCode', [
  'giCrud', function(Crud) {
    return Crud.factory('discountCode');
  }
]);

angular.module('gi.commerce').factory('giEcommerceAnalytics', [
  'giLog', 'giAnalytics', function(Log, Analytics) {
    var enhancedEcommerce, google, requireGaPlugin;
    enhancedEcommerce = false;
    if (typeof ga !== "undefined" && ga !== null) {
      google = ga;
    }
    requireGaPlugin = function(x) {
      Log.debug('ga requiring ' + x);
      if (google != null) {
        return google('require', x);
      }
    };
    return {
      viewProductList: function(name, items) {
        Log.log('Product list: ' + name + ' with: ' + items.length + ' items viewed');
        angular.forEach(items, function(item, idx) {
          var impression;
          Log.log(item);
          impression = {
            id: item.name,
            name: item.displayName,
            list: name,
            position: idx + 1
          };
          return Analytics.Impression(impression);
        });
        return Analytics.PageView();
      },
      sendCartView: function(obj, items) {
        var i, inCartProducts, j, len, prod;
        inCartProducts = [];
        if (google != null) {
          if (!enhancedEcommerce) {
            requireGaPlugin('ec');
          }
          if (items != null) {
            for (j = 0, len = items.length; j < len; j++) {
              i = items[j];
              prod = {
                id: i._data.id,
                name: i._name,
                quantity: i._quantity
              };
              ga('ec:addProduct', prod);
            }
          }
          ga('ec:setAction', 'checkout', obj);
          return ga('send', 'pageview');
        }
      },
      sendTransaction: function(obj, items) {
        var i, id, j, len, possible, prod, ref, ref1, ref2, ref3, rev;
        id = '';
        possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        i = 0;
        while (i < 25) {
          id += possible.charAt(Math.floor(Math.random() * possible.length));
          i++;
        }
        rev = 0;
        if (google != null) {
          if (!enhancedEcommerce) {
            requireGaPlugin('ec');
          }
        }
        if (items != null) {
          for (j = 0, len = items.length; j < len; j++) {
            i = items[j];
            rev += parseFloat((ref = i._priceList) != null ? (ref1 = ref.prices) != null ? ref1.US : void 0 : void 0);
            prod = {
              id: i._data.name,
              name: i._data.displayName,
              price: "'" + ((ref2 = i._priceList) != null ? (ref3 = ref2.prices) != null ? ref3.US : void 0 : void 0) + "'" || '',
              quantity: i._quantity
            };
            ga('ec:addProduct', prod);
          }
        }
        ga('ec:setAction', 'purchase', {
          id: id,
          revenue: rev
        });
        return ga('send', 'event', 'Ecommerce', 'Purchase');
      }
    };
  }
]);

angular.module('gi.commerce').factory('giMarket', [
  'giCrud', function(Crud) {
    return Crud.factory('market');
  }
]);

angular.module('gi.commerce').factory('giOrder', [
  '$q', 'giCrud', 'giCustomer', 'giOrderLine', function($q, Crud, Customer, OrderLine) {
    var crudService, factory, findById, forOwner;
    crudService = Crud.factory('orders', true);
    findById = function(id) {
      var deferred;
      deferred = $q.defer();
      crudService.get(id).then(function(order) {
        if ((order != null) && (order.owner != null)) {
          return Customer.getSimple(order.owner.key, function(customer) {
            order.customer = customer;
            return OrderLine.forOrder(id).then(function(orderLines) {
              order.orderLines = orderLines;
              return deferred.resolve(order);
            });
          });
        } else {
          return deferred.resolve();
        }
      });
      return deferred.promise;
    };
    forOwner = function(ownerId) {
      var deferred;
      deferred = $q.defer();
      crudService.query({
        'owner.key': ownerId
      }).then(function(orders) {
        return deferred.resolve(orders);
      });
      return deferred.promise;
    };
    factory = function() {
      return {
        customerId: '',
        invoiceNumber: '',
        date: moment().toDate(),
        notes: '',
        attributes: [
          {
            name: "confirmationSent",
            value: "false"
          }, {
            name: "excessDue",
            value: "0"
          }
        ]
      };
    };
    return {
      findById: findById,
      get: findById,
      destroy: crudService.destroy,
      save: crudService.save,
      factory: factory,
      forOwner: forOwner
    };
  }
]);

angular.module('gi.commerce').factory('giOrderLine', [
  '$q', 'giCrud', function($q, Crud) {
    var crudService, forCustomer, forOrder, forProduct;
    crudService = Crud.factory('orderlines', true);
    forOrder = function(orderId) {
      var deferred;
      deferred = $q.defer();
      crudService.query({
        orderId: orderId
      }).then(function(orderlines) {
        return deferred.resolve(orderlines);
      });
      return deferred.promise;
    };
    forCustomer = function(customerId) {
      var deferred;
      deferred = $q.defer();
      crudService.query({
        'attributes.value': customerId
      }).then(function(orderlines) {
        return deferred.resolve(orderlines);
      });
      return deferred.promise;
    };
    forProduct = function(productId) {
      var deferred;
      deferred = $q.defer();
      crudService.query({
        productId: productId
      }).then(function(orderlines) {
        return deferred.resolve(orderlines);
      });
      return deferred.promise;
    };
    return {
      findById: crudService.get,
      get: crudService.get,
      forOrder: forOrder,
      save: crudService.save,
      destroy: crudService.destroy,
      forCustomer: forCustomer,
      forProduct: forProduct
    };
  }
]);

angular.module('gi.commerce').factory('giPayment', [
  '$q', '$http', function($q, $http) {
    var stripeInstance;
    stripeInstance = void 0;
    return {
      stripe: {
        createStripeInstance: function(key) {
          if (Stripe.StripeV3) {
            stripeInstance = Stripe.StripeV3(key, {
              betas: ['payment_intent_beta_3']
            });
          } else {
            stripeInstance = Stripe(key, {
              betas: ['payment_intent_beta_3']
            });
          }
          return stripeInstance;
        },
        getStripeInstance: function() {
          if (stripeInstance) {
            return stripeInstance;
          } else {
            this.createStripeInstance(vfq.stripePubKey);
            return stripeInstance;
          }
        },
        setKey: function(key) {
          return Stripe.setPublishableKey(key);
        },
        getToken: function(card) {
          var deferred, exp, match, stripeCard;
          deferred = $q.defer();
          stripeCard = {
            number: card.number,
            cvc: card.security
          };
          exp = /^(0[1-9]|1[0-2])\/?(?:20)?([0-9]{2})$/;
          match = exp.exec(card.expiry);
          if (match != null) {
            stripeCard.exp_month = match[1];
            stripeCard.exp_year = "20" + match[2];
          }
          Stripe.card.createToken(stripeCard, function(status, response) {
            if (response.error != null) {
              return deferred.reject(response.error.message);
            } else {
              return deferred.resolve(response);
            }
          });
          return deferred.promise;
        },
        mountElement: function(id, Cart) {
          var card, elements, stripeIns;
          stripeIns = this.getStripeInstance();
          elements = stripeIns.elements();
          card = elements.create('card');
          Cart.saveCardElement(card);
          card.mount(id);
          return card;
        },
        createIntent: function(chargeRequest) {
          var deferred;
          deferred = $q.defer();
          $http.post('/api/makeIntent', chargeRequest).success(function(client_secret) {
            return deferred.resolve(client_secret);
          }).error(function(data) {
            var msg;
            msg = 'payment not completed';
            if (data.message != null) {
              msg = data.message;
            }
            return deferred.reject(msg);
          });
          return deferred.promise;
        },
        charge: function(chargeRequest) {
          var deferred;
          deferred = $q.defer();
          $http.post('/api/checkout', chargeRequest).success(function() {
            return deferred.resolve('payment completed');
          }).error(function(data) {
            var msg;
            msg = 'payment not completed';
            if (data.message != null) {
              msg = data.message;
            }
            return deferred.reject(msg);
          });
          return deferred.promise;
        }
      }
    };
  }
]);

angular.module('gi.commerce').factory('giPriceList', [
  'giCrud', function(Crud) {
    return Crud.factory('priceList');
  }
]);


/*global angular */
angular.module('gi.commerce').factory('giProduct', [
  '$q', '$filter', 'giCrud', 'giCategory', 'giOrderLine', function($q, $filter, Crud, Category, OrderLine) {
    var all, crudService, findById, forCategory, getCached, save, variantFactory;
    crudService = Crud.factory('products', true);
    all = function(params) {
      var deferred;
      deferred = $q.defer();
      crudService.all(params).then(function(products) {
        angular.forEach(products, function(product) {
          var d;
          d = moment.utc(product.date).toDate();
          return product.date = moment([d.getFullYear(), d.getMonth(), d.getDate()]).toDate();
        });
        return deferred.resolve(products);
      });
      return deferred.promise;
    };
    findById = function(id) {
      var deferred;
      deferred = $q.defer();
      crudService.get(id).then(function(product) {
        var d;
        d = moment.utc(product.date).toDate();
        product.date = moment([d.getFullYear(), d.getMonth(), d.getDate()]).toDate();
        return deferred.resolve(product);
      });
      return deferred.promise;
    };
    forCategory = function(id) {
      var deferred;
      deferred = $q.defer();
      Category.all().then(function(categories) {
        var catList;
        catList = $filter('filter')(categories, function(category) {
          return (category.slug === id) || (category._id === id);
        });
        if (catList.length > 0) {
          return all({
            categories: catList[0]._id
          }).then(function(results) {
            return deferred.resolve(results);
          });
        } else {
          return deferred.resolve();
        }
      });
      return deferred.promise;
    };
    save = function(product) {
      var d;
      d = product.date;
      product.date = moment.utc([d.getFullYear(), d.getMonth(), d.getDate()]).toDate();
      return crudService.save(product);
    };
    getCached = function(id) {
      var d, product;
      product = crudService.getCached(id);
      if (product != null) {
        d = moment.utc(product.date).toDate();
        product.date = moment([d.getFullYear(), d.getMonth(), d.getDate()]).toDate();
      }
      return product;
    };
    variantFactory = function(parentId, callback) {
      var deferred;
      deferred = $q.defer();
      crudService.get(parentId).then(function(product) {
        var result;
        result = {
          siteId: product.siteId,
          stock: product.stock,
          price: product.price,
          date: moment().toDate(),
          categories: product.categories,
          parentId: parentId,
          description: product.description,
          detail: product.detail,
          notes: ''
        };
        return deferred.resolve(result);
      });
      return deferred.promise;
    };
    return {
      variantFactory: variantFactory,
      query: all,
      all: all,
      get: findById,
      findById: findById,
      getCached: getCached,
      save: save,
      destroy: crudService.destroy,
      forCategory: forCategory
    };
  }
]);
