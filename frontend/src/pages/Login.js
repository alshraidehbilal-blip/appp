import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Languages } from 'lucide-react';

export default function Login() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const { user, login, changePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    if (user && !user.is_first_login) {
      navigateToDashboard(user.role);
    }
  }, [user]);

  const navigateToDashboard = (role) => {
    switch (role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'doctor':
        navigate('/doctor/dashboard');
        break;
      case 'receptionist':
        navigate('/receptionist/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    document.body.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await login(username, password);
      
      if (userData.is_first_login) {
        setTempUser(userData);
        setShowPasswordChange(true);
      } else {
        toast.success(t('common.success'));
        navigateToDashboard(userData.role);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await changePassword(newPassword);
      toast.success('Password changed successfully');
      setShowPasswordChange(false);
      navigateToDashboard(tempUser.role);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-teal-50 px-4\">
      <div className=\"absolute top-4 right-4\">
        <Button
          variant=\"outline\"
          size=\"sm\"
          onClick={toggleLanguage}
          data-testid=\"language-toggle\"
          className=\"gap-2\"
        >
          <Languages className=\"h-4 w-4\" />
          {i18n.language === 'en' ? 'عربي' : 'English'}
        </Button>
      </div>

      <Card className=\"w-full max-w-md shadow-lg\" data-testid=\"login-card\">
        <CardHeader className=\"space-y-2 text-center\">
          <div className=\"mx-auto mb-4 h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center\">
            <svg className=\"h-10 w-10 text-teal-700\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 6v6m0 0v6m0-6h6m-6 0H6\" />
            </svg>
          </div>
          <CardTitle className=\"text-3xl font-bold text-teal-900\">{t('appName')}</CardTitle>
          <CardDescription className=\"text-base\">{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className=\"space-y-4\">
            <div className=\"space-y-2\">
              <Label htmlFor=\"username\" className=\"text-sm font-medium\">
                {t('login.username')}
              </Label>
              <Input
                id=\"username\"
                type=\"text\"
                placeholder={t('login.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid=\"username-input\"
                className=\"h-11\"
              />
            </div>
            <div className=\"space-y-2\">
              <Label htmlFor=\"password\" className=\"text-sm font-medium\">
                {t('login.password')}
              </Label>
              <Input
                id=\"password\"
                type=\"password\"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid=\"password-input\"
                className=\"h-11\"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type=\"submit\"
              className=\"w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-medium\"
              disabled={loading}
              data-testid=\"login-button\"
            >
              {loading ? t('common.loading') : t('login.loginButton')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
        <DialogContent data-testid=\"password-change-dialog\">
          <DialogHeader>
            <DialogTitle>{t('login.changePassword')}</DialogTitle>
            <DialogDescription>
              This is your first login. Please change your password to continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange}>
            <div className=\"space-y-4 py-4\">
              <div className=\"space-y-2\">
                <Label htmlFor=\"newPassword\">{t('login.newPassword')}</Label>
                <Input
                  id=\"newPassword\"
                  type=\"password\"
                  placeholder={t('login.newPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  data-testid=\"new-password-input\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label htmlFor=\"confirmPassword\">{t('login.confirmPassword')}</Label>
                <Input
                  id=\"confirmPassword\"
                  type=\"password\"
                  placeholder={t('login.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  data-testid=\"confirm-password-input\"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type=\"submit\"
                className=\"w-full bg-teal-700 hover:bg-teal-800\"
                disabled={loading}
                data-testid=\"update-password-button\"
              >
                {loading ? t('common.loading') : t('login.updatePassword')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
