import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

const selectSalesOrderState = (state: RootState) => state.salesOrder;

export const selectSalesOrders = createSelector(
  selectSalesOrderState,
  (state) => state.orders
);

export const selectCurrentSalesOrder = createSelector(
  selectSalesOrderState,
  (state) => state.currentOrder
);

export const selectSelectedSalesOrder = createSelector(
  selectSalesOrderState,
  (state) => state.selectedOrder
);

export const selectSalesOrderLoading = createSelector(
  selectSalesOrderState,
  (state) => state.loading
);

export const selectSalesOrderCreating = createSelector(
  selectSalesOrderState,
  (state) => state.creating
);

export const selectSalesOrderValidatingCoupon = createSelector(
  selectSalesOrderState,
  (state) => state.validatingCoupon
);

export const selectSalesOrderError = createSelector(
  selectSalesOrderState,
  (state) => state.error
);

export const selectSalesOrderPagination = createSelector(
  selectSalesOrderState,
  (state) => ({
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    totalOrders: state.totalOrders,
  })
);

export const selectSalesOrderIsOffline = createSelector(
  selectSalesOrderState,
  (state) => state.isOffline
);

export const selectSalesOrderLastFetched = createSelector(
  selectSalesOrderState,
  (state) => state.lastFetched
);

export const selectCouponValidation = createSelector(
  selectSalesOrderState,
  (state) => state.couponValidation
);


