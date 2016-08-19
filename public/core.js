angular.module('starter', []);
function HeaderController($scope, $http, $location) {
    $scope.isActive = function (viewLocation) { 
        return viewLocation === $location.path();
    };
}
/*
(function() {
  'use strict';

  angular.module('MyApp',['ngMaterial', 'ngMessages', 'material.svgAssetsCache'])
      .controller('AppCtrl', AppCtrl);

  function AppCtrl($scope) {
    $scope.currentNavItem = 'page1';
  }
})();*/