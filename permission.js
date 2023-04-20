import router from "./router";
import store from "./store";
import { Message } from "element-ui";
import NProgress from "nprogress"; // progress bar
import "nprogress/nprogress.css"; // progress bar style
import { getToken } from "@/utils/auth"; // get token from cookie
import getPageTitle from "@/utils/get-page-title";

NProgress.configure({ showSpinner: false }); // NProgress Configuration

const whiteList = ["/login", "/auth-redirect"]; // no redirect whitelist   白名单 没有token可直接进入

router.beforeEach(async (to, from, next) => {
  // start progress bar
  NProgress.start();

  // set page title
  document.title = getPageTitle(to.meta.title);

  // determine whether the user has logged in   确定用户是否已登录 有无token
  const hasToken = getToken();

  // 没有登录跳转到登录页面
  if (hasToken) {
    // 退出
    if (to.path === "/login") {
      // if is logged in, redirect to the home page
      next({ path: "/" });
      NProgress.done(); // hack: https://github.com/PanJiaChen/vue-element-admin/pull/2939
    } else {
      // determine whether the user has obtained his permission roles through getInfo   确定用户是否已通过getInfo获得其权限角色
      // 第一次登录时只获取到了 token 但是并没有拿到 roles 只有通过 getInfo 这个接口才能拿到 roles，所以这个地方走了两次
      const hasRoles = store.getters.roles && store.getters.roles.length > 0;

      // 没有权限 用vuex去调用 getInfo 接口 并把 roles 存储在 vuex 的 store 中
      if (hasRoles) {
        next();
      } else {
        try {
          // get user info   获取用户信息
          // note: roles must be a object array! such as: ['admin'] or ,['developer','editor']   注意：角色必须是对象数组！例如：['admin']或，['developer'，'editor']
          const { roles } = await store.dispatch("user/getInfo");

          // generate accessible routes map based on roles   基于角色生成可访问的路线图   整合有权限可访问的路由
          const accessRoutes = await store.dispatch(
            "permission/generateRoutes",
            roles
          );

          // dynamically add accessible routes   动态添加可访问的路由
          router.addRoutes(accessRoutes);

          // hack method to ensure that addRoutes is complete   hack方法以确保addRoutes是完整的
          // set the replace: true, so the navigation will not leave a history record   设置replace:true，这样导航将不会留下历史记录
          next({ ...to, replace: true });
        } catch (error) {
          // remove token and go to login page to re-login
          await store.dispatch("user/resetToken");
          Message.error(error || "Has Error");
          next(`/login?redirect=${to.path}`);
          NProgress.done();
        }
      }
    }
  } else {
    /* has no token*/

    if (whiteList.indexOf(to.path) !== -1) {
      // in the free login whitelist, go directly   在免费登录白名单中，直接进入
      next();
    } else {
      // other pages that do not have permission to access are redirected to the login page.   没有访问权限的其他页面将重定向到登录页面。
      next(`/login?redirect=${to.path}`);
      NProgress.done();
    }
  }
});

router.afterEach(() => {
  // finish progress bar
  NProgress.done();
});
