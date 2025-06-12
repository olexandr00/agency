-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Хост: 127.0.0.1
-- Время создания: Июн 04 2025 г., 20:56
-- Версия сервера: 10.4.32-MariaDB
-- Версия PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- База данных: `agency`
--

-- --------------------------------------------------------

--
-- Структура таблицы `campaigns`
--

CREATE TABLE `campaigns` (
  `CampaignID` int(11) NOT NULL,
  `CampaignName` varchar(255) NOT NULL,
  `ClientID` int(11) NOT NULL,
  `ResponsibleEmployeeID` int(11) DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  `CampaignBudget` decimal(12,2) DEFAULT NULL,
  `CampaignStatus` enum('Planned','Active','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
  `CampaignDescription` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `campaigns`
--

INSERT INTO `campaigns` (`CampaignID`, `CampaignName`, `ClientID`, `ResponsibleEmployeeID`, `StartDate`, `EndDate`, `CampaignBudget`, `CampaignStatus`, `CampaignDescription`) VALUES
(1, 'Весняне оновлення для Світанок Груп', 1, 1, '2025-03-01', '2025-05-31', 85000.00, 'Active', 'Комплексна рекламна кампанія на весняний сезон.'),
(2, 'Запуск інноваційного продукту для Обрій Технології', 2, 5, '2025-04-15', '2025-07-15', 125000.00, 'Planned', 'Рекламна кампанія для виведення нового IT-продукту на ринок.'),
(3, 'Підвищення онлайн-продажів для ФОП Захарченко', 3, 3, '2025-06-01', '2025-08-31', 55000.00, 'Planned', 'Акцент на SEO-просуванні та контекстній рекламі для інтернет-магазину.'),
(4, 'Глобальний ребрендинг АТ Перспектива Холдинг', 4, 2, '2025-02-01', '2025-12-31', 270000.00, 'Active', 'Повний комплекс робіт з ребрендингу компанії на міжнародному рівні.'),
(5, 'Лідогенерація для ТзОВ Креативні Рішення', 5, 4, '2025-05-01', '2025-07-31', 78000.00, 'Completed', 'Кампанія по залученню якісних лідів через таргетовану рекламу та контент-маркетинг.');

-- --------------------------------------------------------

--
-- Структура таблицы `campaign_services`
--

CREATE TABLE `campaign_services` (
  `CampaignServiceID` int(11) NOT NULL,
  `CampaignID` int(11) NOT NULL,
  `ServiceID` int(11) NOT NULL,
  `ServiceQuantity` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `campaign_services`
--

INSERT INTO `campaign_services` (`CampaignServiceID`, `CampaignID`, `ServiceID`, `ServiceQuantity`) VALUES
(1, 1, 1, 1),
(2, 1, 2, 2),
(3, 2, 3, 1),
(4, 2, 5, 1),
(5, 3, 1, 1),
(6, 3, 4, 1),
(7, 4, 1, 1),
(8, 4, 3, 1),
(9, 5, 2, 2),
(10, 5, 5, 1);

-- --------------------------------------------------------

--
-- Структура таблицы `clients`
--

CREATE TABLE `clients` (
  `ClientID` int(11) NOT NULL,
  `ClientCompanyName` varchar(255) DEFAULT NULL,
  `ContactPersonLastName` varchar(100) NOT NULL,
  `ContactPersonFirstName` varchar(100) NOT NULL,
  `ContactPersonMiddleName` varchar(100) DEFAULT NULL,
  `ContactPersonPhone` varchar(20) NOT NULL,
  `ContactPersonEmail` varchar(100) DEFAULT NULL,
  `CooperationStartDate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `clients`
--

INSERT INTO `clients` (`ClientID`, `ClientCompanyName`, `ContactPersonLastName`, `ContactPersonFirstName`, `ContactPersonMiddleName`, `ContactPersonPhone`, `ContactPersonEmail`, `CooperationStartDate`) VALUES
(1, 'ТОВ \"Світанок Груп\"', 'Бондаренко', 'Ігор', 'Анатолійович', '+380509876501', 'igor.b@svitanokgroup.com', '2022-10-05'),
(2, 'ПП \"Обрій Технології\"', 'Ткачук', 'Наталія', 'Вікторівна', '+380678765402', 'natalia.t@obriytech.ua', '2023-03-12'),
(3, 'ФОП Захарченко В.О. \"Інновації\"', 'Захарченко', 'Віталій', 'Олегович', '+380997654303', 'vitaliy.z.innovate@fop.net', '2024-01-20'),
(4, 'АТ \"Перспектива Холдинг\"', 'Павленко', 'Оксана', 'Дмитрівна', '+380636543204', 'oksana.p@perspektyvaholding.com.ua', '2022-07-15'),
(5, 'ТзОВ \"Креативні Рішення\"', 'Савченко', 'Денис', 'Сергійович', '+380735432105', 'denys.s@creativesolutions.biz', '2023-11-30');

-- --------------------------------------------------------

--
-- Структура таблицы `contactmessages`
--

CREATE TABLE `contactmessages` (
  `MessageID` int(11) NOT NULL,
  `SenderName` varchar(150) NOT NULL,
  `SenderEmail` varchar(150) NOT NULL,
  `SenderPhone` varchar(50) DEFAULT NULL,
  `MessageSubject` varchar(255) DEFAULT NULL,
  `MessageText` text NOT NULL,
  `SubmissionDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `IsRead` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `contactmessages`
--

INSERT INTO `contactmessages` (`MessageID`, `SenderName`, `SenderEmail`, `SenderPhone`, `MessageSubject`, `MessageText`, `SubmissionDate`, `IsRead`) VALUES
(1, 'Ольга Коваленко', 'olga.k@examplemail.com', '+380981234501', 'Запит про співпрацю в сфері SMM', 'Доброго дня, хотіла б дізнатися більше про ваші послуги з просування в соціальних мережах.', '2025-05-28 11:00:00', 0),
(2, 'Максим Іванов', 'maxim.i@provider.example.net', '+380662345602', 'Технічне питання щодо інтеграції', 'Не можу знайти інформацію про можливість інтеграції вашої CRM з нашим сервісом.', '2025-05-28 11:05:00', 1),
(3, 'Юлія Петренко', 'julia.p@examplegmx.com', NULL, 'Пропозиція партнерства та спільного вебінару', 'Ми компанія \"Експерт Консалт\", пропонуємо провести спільний вебінар на тему цифрового маркетингу.', '2025-05-28 11:10:00', 1),
(4, 'Андрій Сидорук', 'andriy.s@exampleukr.net', '+380503456703', 'Подяка за консультацію', 'Ваша консультація щодо SEO була дуже корисною та інформативною, дякую!', '2025-05-28 11:15:00', 1),
(5, 'Катерина Лисенко', 'kateryna.l@exampleicloud.com', '+380934567804', 'Запит на розрахунок вартості брендингу', 'Потрібна детальна консультація та розрахунок вартості розробки брендбуку для нового проекту.', '2025-05-28 11:20:00', 0);

-- --------------------------------------------------------

--
-- Структура таблицы `employees`
--

CREATE TABLE `employees` (
  `EmployeeID` int(11) NOT NULL,
  `LastName` varchar(100) NOT NULL,
  `FirstName` varchar(100) NOT NULL,
  `MiddleName` varchar(100) DEFAULT NULL,
  `PositionID` int(11) NOT NULL,
  `Phone` varchar(20) NOT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `HireDate` date NOT NULL,
  `Salary` decimal(10,2) NOT NULL,
  `DismissalDate` date DEFAULT NULL,
  `PhotoURL` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `employees`
--

INSERT INTO `employees` (`EmployeeID`, `LastName`, `FirstName`, `MiddleName`, `PositionID`, `Phone`, `Email`, `HireDate`, `Salary`, `DismissalDate`, `PhotoURL`) VALUES
(1, 'Мельник', 'Андрій', 'Васильович', 1, '+380501112201', 'andriy.melnyk@agency.example.ua', '2023-01-14', 72000.00, NULL, '/uploads/employees/employee-photo-1748881978492-925550809.jpg'),
(2, 'Ковальчук', 'Олена', 'Ігорівна', 2, '+380672223302', 'olena.kovalchuk@agency.example.ua', '2022-11-09', 68000.00, NULL, '/uploads/employees/employee-photo-1748881936607-443025276.jpg'),
(3, 'Григоренко', 'Сергій', 'Петрович', 3, '+380993334403', 'serhiy.hryhorenko@agency.example.ua', '2023-05-16', 57000.00, NULL, '/uploads/employees/employee-photo-1748881910098-95722000.jpg'),
(4, 'Лисенко', 'Марина', 'Олександрівна', 4, '+380634445504', 'maryna.lysenko@agency.example.ua', '2024-01-31', 52000.00, NULL, '/uploads/employees/employee-photo-1748881970233-443692934.jpg'),
(5, 'Ткаченко', 'Володимир', 'Михайлович', 5, '+380735556605', 'volodymyr.tkachenko@agency.example.ua', '2023-07-31', 61000.00, NULL, '/uploads/employees/employee-photo-1748881986820-625799088.jpg');

-- --------------------------------------------------------

--
-- Структура таблицы `positions`
--

CREATE TABLE `positions` (
  `PositionID` int(11) NOT NULL,
  `PositionName` varchar(100) NOT NULL,
  `PositionDescription` text DEFAULT NULL,
  `BasePositionRate` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `positions`
--

INSERT INTO `positions` (`PositionID`, `PositionName`, `PositionDescription`, `BasePositionRate`) VALUES
(1, 'Головний маркетолог', 'Стратегічне планування маркетингових активностей, управління командою.', 70000.00),
(2, 'Старший графічний дизайнер', 'Розробка ключових візуальних концепцій, брендинг, менторство молодших дизайнерів.', 65000.00),
(3, 'SEO спеціаліст', 'Глибока оптимізація сайтів для пошукових систем, аналітика, технічний аудит.', 55000.00),
(4, 'SMM-стратег', 'Розробка та реалізація SMM-стратегій, контент-планування, аналіз ефективності.', 52000.00),
(5, 'Керівник відділу по роботі з клієнтами', 'Робота з ключовими клієнтами, ведення складних проектів, розвиток відносин.', 62000.00);

-- --------------------------------------------------------

--
-- Структура таблицы `reviews`
--

CREATE TABLE `reviews` (
  `ReviewID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `ServiceID` int(11) DEFAULT NULL,
  `ReviewText` text NOT NULL,
  `Rating` tinyint(1) DEFAULT NULL,
  `ReviewDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `IsApproved` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `reviews`
--

INSERT INTO `reviews` (`ReviewID`, `UserID`, `ServiceID`, `ReviewText`, `Rating`, `ReviewDate`, `IsApproved`) VALUES
(1, 10, 1, 'Дуже задоволений розробленою маркетинговою стратегією. Чітко, професійно та з урахуванням всіх нюансів мого бізнесу. Рекомендую!', 5, '2025-05-28 09:00:00', 1),
(2, 11, 2, 'Таргетована реклама спрацювала на відмінно! Вже за перший місяць отримали значний приріст клієнтів. Дякую команді!', 5, '2025-05-28 09:05:00', 1),
(3, 12, NULL, 'Загалом співпраця була позитивною. Були деякі затримки з відповідями, але результат роботи хороший.', 4, '2025-05-28 09:10:00', 0),
(4, 13, 4, 'Автоматизація email-маркетингу значно полегшила нам роботу. Листи надходять вчасно, клієнти задоволені.', 4, '2025-05-28 09:15:00', 1),
(5, 14, 5, 'Відеоконтент для YouTube каналу вийшов просто неймовірний! Якість зйомки та монтажу на висоті. Аудиторія в захваті!', 5, '2025-05-28 09:20:00', 1);

-- --------------------------------------------------------

--
-- Структура таблицы `services`
--

CREATE TABLE `services` (
  `ServiceID` int(11) NOT NULL,
  `ServiceName` varchar(255) NOT NULL,
  `ServiceDescription` text DEFAULT NULL,
  `BasePrice` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `services`
--

INSERT INTO `services` (`ServiceID`, `ServiceName`, `ServiceDescription`, `BasePrice`) VALUES
(1, 'Комплексна маркетингова стратегія', 'Розробка довгострокової маркетингової стратегії, включаючи аналіз ринку, конкурентів, ЦА та позиціонування.', 45000.00),
(2, 'Таргетована реклама (Facebook/Instagram)', 'Налаштування, запуск та оптимізація рекламних кампаній в соціальних мережах Facebook та Instagram.', 18500.00),
(3, 'Розробка корпоративного сайту', 'Створення багатосторінкового сайту з унікальним дизайном та необхідним функціоналом.', 75000.00),
(4, 'Автоматизація Email-маркетингу', 'Налаштування автоматичних ланцюжків листів, сегментація бази, аналітика.', 15000.00),
(5, 'Створення відеоконтенту для YouTube', 'Розробка сценарію, зйомка, монтаж та оптимізація відео для YouTube каналу.', 30000.00);

-- --------------------------------------------------------

--
-- Структура таблицы `siteorders`
--

CREATE TABLE `siteorders` (
  `OrderID` int(11) NOT NULL,
  `PublicOrderID` varchar(20) DEFAULT NULL,
  `UserID` int(11) NOT NULL,
  `OrderDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `OrderStatus` enum('new','processing','completed','cancelled') NOT NULL DEFAULT 'new',
  `CustomerName` varchar(255) NOT NULL,
  `CustomerEmail` varchar(255) NOT NULL,
  `CustomerPhone` varchar(50) NOT NULL,
  `CustomerNotes` text DEFAULT NULL,
  `TotalAmount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `siteorders`
--

INSERT INTO `siteorders` (`OrderID`, `PublicOrderID`, `UserID`, `OrderDate`, `OrderStatus`, `CustomerName`, `CustomerEmail`, `CustomerPhone`, `CustomerNotes`, `TotalAmount`) VALUES
(8, 'ZAM-25-F2349B', 2, '2025-06-02 19:03:35', 'completed', 'admin', 'admin@example.com', '+3864634247', 'Q', 30000.00);

-- --------------------------------------------------------

--
-- Структура таблицы `siteorderservices`
--

CREATE TABLE `siteorderservices` (
  `OrderItemID` int(11) NOT NULL,
  `OrderID` int(11) NOT NULL,
  `ServiceID` int(11) NOT NULL,
  `Quantity` int(11) NOT NULL DEFAULT 1,
  `PriceAtOrder` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `siteorderservices`
--

INSERT INTO `siteorderservices` (`OrderItemID`, `OrderID`, `ServiceID`, `Quantity`, `PriceAtOrder`) VALUES
(8, 8, 4, 2, 15000.00);

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `UserID` int(11) NOT NULL,
  `Username` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Role` enum('user','admin') NOT NULL DEFAULT 'user',
  `RegistrationDate` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `users`
--

INSERT INTO `users` (`UserID`, `Username`, `Email`, `PasswordHash`, `Role`, `RegistrationDate`) VALUES
(2, 'admin', 'admin@example.com', '$2a$10$KQNTYhnqCcpY7Ker3/F8mewcyl8rrLXyKs7r1yiuBuxZY5ausb4YK', 'admin', '2025-05-18 18:32:52'),
(10, 'ivan_klymenko', 'ivan.k@testmail.com', '$2a$10$dummyHashForIvanKlymenko1', 'user', '2025-05-28 08:00:00'),
(11, 'maria_popova', 'maria.p@testmail.com', '$2a$10$dummyHashForMariaPopova2', 'user', '2025-05-28 08:01:00'),
(12, 'oleg_sydorenko', 'oleg.s@testmail.com', '$2a$10$dummyHashForOlegSydorenko3', 'user', '2025-05-28 08:02:00'),
(13, 'anna_bilous', 'anna.b@testmail.com', '$2a$10$dummyHashForAnnaBilous4', 'user', '2025-05-28 08:03:00'),
(14, 'petro_gonchar', 'petro.g@testmail.com', '$2a$10$dummyHashForPetroGonchar5', 'user', '2025-05-28 08:04:00'),

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `campaigns`
--
ALTER TABLE `campaigns`
  ADD PRIMARY KEY (`CampaignID`),
  ADD KEY `ClientID` (`ClientID`),
  ADD KEY `ResponsibleEmployeeID` (`ResponsibleEmployeeID`);

--
-- Индексы таблицы `campaign_services`
--
ALTER TABLE `campaign_services`
  ADD PRIMARY KEY (`CampaignServiceID`),
  ADD UNIQUE KEY `UQ_Campaign_Service` (`CampaignID`,`ServiceID`),
  ADD KEY `ServiceID` (`ServiceID`);

--
-- Индексы таблицы `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`ClientID`),
  ADD UNIQUE KEY `ContactPersonPhone` (`ContactPersonPhone`),
  ADD UNIQUE KEY `ContactPersonEmail` (`ContactPersonEmail`);

--
-- Индексы таблицы `contactmessages`
--
ALTER TABLE `contactmessages`
  ADD PRIMARY KEY (`MessageID`);

--
-- Индексы таблицы `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`EmployeeID`),
  ADD UNIQUE KEY `Phone` (`Phone`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD KEY `PositionID` (`PositionID`);

--
-- Индексы таблицы `positions`
--
ALTER TABLE `positions`
  ADD PRIMARY KEY (`PositionID`),
  ADD UNIQUE KEY `PositionName` (`PositionName`);

--
-- Индексы таблицы `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`ReviewID`),
  ADD KEY `FK_Review_User` (`UserID`),
  ADD KEY `FK_Review_Service` (`ServiceID`);

--
-- Индексы таблицы `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`ServiceID`),
  ADD UNIQUE KEY `ServiceName` (`ServiceName`);

--
-- Индексы таблицы `siteorders`
--
ALTER TABLE `siteorders`
  ADD PRIMARY KEY (`OrderID`),
  ADD UNIQUE KEY `PublicOrderID` (`PublicOrderID`),
  ADD KEY `FK_SiteOrder_User` (`UserID`);

--
-- Индексы таблицы `siteorderservices`
--
ALTER TABLE `siteorderservices`
  ADD PRIMARY KEY (`OrderItemID`),
  ADD UNIQUE KEY `UQ_Order_Service` (`OrderID`,`ServiceID`),
  ADD KEY `FK_OrderItem_Order` (`OrderID`),
  ADD KEY `FK_OrderItem_Service` (`ServiceID`);

--
-- Индексы таблицы `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `UQ_Username` (`Username`),
  ADD UNIQUE KEY `UQ_Email` (`Email`);

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `campaigns`
--
ALTER TABLE `campaigns`
  MODIFY `CampaignID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT для таблицы `campaign_services`
--
ALTER TABLE `campaign_services`
  MODIFY `CampaignServiceID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT для таблицы `clients`
--
ALTER TABLE `clients`
  MODIFY `ClientID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT для таблицы `contactmessages`
--
ALTER TABLE `contactmessages`
  MODIFY `MessageID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT для таблицы `employees`
--
ALTER TABLE `employees`
  MODIFY `EmployeeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT для таблицы `positions`
--
ALTER TABLE `positions`
  MODIFY `PositionID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT для таблицы `reviews`
--
ALTER TABLE `reviews`
  MODIFY `ReviewID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT для таблицы `services`
--
ALTER TABLE `services`
  MODIFY `ServiceID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT для таблицы `siteorders`
--
ALTER TABLE `siteorders`
  MODIFY `OrderID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT для таблицы `siteorderservices`
--
ALTER TABLE `siteorderservices`
  MODIFY `OrderItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Ограничения внешнего ключа сохраненных таблиц
--

--
-- Ограничения внешнего ключа таблицы `campaigns`
--
ALTER TABLE `campaigns`
  ADD CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`ClientID`) REFERENCES `clients` (`ClientID`),
  ADD CONSTRAINT `campaigns_ibfk_2` FOREIGN KEY (`ResponsibleEmployeeID`) REFERENCES `employees` (`EmployeeID`);

--
-- Ограничения внешнего ключа таблицы `campaign_services`
--
ALTER TABLE `campaign_services`
  ADD CONSTRAINT `campaign_services_ibfk_1` FOREIGN KEY (`CampaignID`) REFERENCES `campaigns` (`CampaignID`) ON DELETE CASCADE,
  ADD CONSTRAINT `campaign_services_ibfk_2` FOREIGN KEY (`ServiceID`) REFERENCES `services` (`ServiceID`);

--
-- Ограничения внешнего ключа таблицы `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`PositionID`) REFERENCES `positions` (`PositionID`);

--
-- Ограничения внешнего ключа таблицы `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `FK_Review_Service` FOREIGN KEY (`ServiceID`) REFERENCES `services` (`ServiceID`) ON DELETE SET NULL,
  ADD CONSTRAINT `FK_Review_User` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `siteorders`
--
ALTER TABLE `siteorders`
  ADD CONSTRAINT `FK_SiteOrder_User` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`);

--
-- Ограничения внешнего ключа таблицы `siteorderservices`
--
ALTER TABLE `siteorderservices`
  ADD CONSTRAINT `FK_OrderItem_Order` FOREIGN KEY (`OrderID`) REFERENCES `siteorders` (`OrderID`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_OrderItem_Service` FOREIGN KEY (`ServiceID`) REFERENCES `services` (`ServiceID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
