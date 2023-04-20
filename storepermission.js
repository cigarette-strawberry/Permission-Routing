import { asyncRoutes, constantRoutes } from "@/router";

/**
 * Use meta.role to determine if the current user has permission   使用meta。角色以确定当前用户是否具有权限
 * @param roles   权限
 * @param route   展开后的单个路由的所有信息
 */
function hasPermission(roles, route) {
  if (route.meta && route.meta.roles) {
    return roles.some((role) => route.meta.roles.includes(role)); // some循环 只要有一项符合规则 则返回true
  } else {
    return true;
  }
}

/**
 * Filter asynchronous routing tables by recursion   通过递归过滤异步路由表
 * @param routes asyncRoutes   异步路由表
 * @param roles   权限 字段
 */
export function filterAsyncRoutes(routes, roles) {
  //
  const res = [];

  routes.forEach((route) => {
    const tmp = { ...route };
    // 判断角色 以确定当前用户是否具有权限
    if (hasPermission(roles, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, roles); // 递归过滤异步路由表
      }
      res.push(tmp);
    }
  });

  return res;
}

const state = {
  routes: [],
  addRoutes: [],
};

const mutations = {
  SET_ROUTES: (state, routes) => {
    state.addRoutes = routes;
    state.routes = constantRoutes.concat(routes);
  },
};

const actions = {
  generateRoutes({ commit }, roles) {
    return new Promise((resolve) => {
      let accessedRoutes;
      // 如果存在这个字段 role 也就是这个权限 即可访问路由表中的所有的路由   //   如果不存在这个字段 则通过递归过滤拿到符合权限的异步路由表
      if (roles.includes("admin")) {
        accessedRoutes = asyncRoutes || [];
      } else {
        accessedRoutes = filterAsyncRoutes(asyncRoutes, roles);
      }
      commit("SET_ROUTES", accessedRoutes); // 把符合权限的异步路由表放到vuex的state中
      resolve(accessedRoutes);
    });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
