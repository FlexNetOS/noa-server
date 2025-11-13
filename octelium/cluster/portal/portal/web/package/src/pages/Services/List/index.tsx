import { getClientUser } from '@/utils/client';
import { useAppSelector } from '@/utils/hooks';
import * as React from 'react';
import Meta from '@/components/Meta';

import { ListNamespaceOptions, ListServiceOptions, Service_Spec_Type } from '@/apis/userv1/userv1';
import { useQuery } from '@tanstack/react-query';

import {
  ResourceListItem,
  ResourceListLabel,
  ResourceListWrapper,
} from '@/components/ResourceList';
import EmptyList from '@/components/EmptyList';
import { Service, ServiceList } from '@/apis/userv1/userv1';
import { getDomain, printResourceNameWithDisplay, toNumOrZero } from '@/utils';
import Label from '@/components/Label';
import { match } from 'ts-pattern';
import Paginator from '@/components/Paginator';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import InfoItem from '@/components/InfoItem';
import CopyText from '@/components/CopyText';
import { BiLinkExternal } from 'react-icons/bi';

import { getServicePrivateFQDN, getServicePublicFQDN } from '@/utils/octelium';
import { Timestamp } from '@/apis/google/protobuf/timestamp';

import { GoBrowser } from 'react-icons/go';
import { BiLogoPostgresql } from 'react-icons/bi';
import { HiMiniCommandLine } from 'react-icons/hi2';
import { TbApi } from 'react-icons/tb';
import { SiKubernetes } from 'react-icons/si';
import { SiMysql } from 'react-icons/si';
import { MdHttp } from 'react-icons/md';
import { FaGlobe } from 'react-icons/fa';

import { IoIosDesktop } from 'react-icons/io';
import { Button, Text } from '@mantine/core';
import { Collapse } from '@mantine/core';
import parseQuery from '@/utils/parseQuery';

const getTypeIcon = (svc: Service) => {
  return match(svc.spec?.type)
    .with(Service_Spec_Type.KUBERNETES, () => <SiKubernetes />)
    .with(Service_Spec_Type.MYSQL, () => <SiMysql />)
    .with(Service_Spec_Type.POSTGRES, () => <BiLogoPostgresql />)
    .with(Service_Spec_Type.SSH, () => <HiMiniCommandLine />)
    .with(Service_Spec_Type.WEB, () => <IoIosDesktop />)
    .otherwise(() => <TypeText name={getType(svc)} />);
};

const TypeText = (props: { name: string }) => {
  return <span className="text-xs font-extrabold md:text-lg">{props.name}</span>;
};

const getType = (svc: Service): string => {
  return match(svc.spec?.type)
    .with(Service_Spec_Type.GRPC, () => 'gRPC')
    .with(Service_Spec_Type.HTTP, () => 'HTTP')
    .with(Service_Spec_Type.KUBERNETES, () => 'Kubernetes')
    .with(Service_Spec_Type.MYSQL, () => 'MySQL')
    .with(Service_Spec_Type.POSTGRES, () => 'PostgreSQL')
    .with(Service_Spec_Type.SSH, () => 'SSH')
    .with(Service_Spec_Type.TCP, () => 'TCP')
    .with(Service_Spec_Type.UDP, () => 'UDP')
    .with(Service_Spec_Type.WEB, () => 'Web App')
    .with(Service_Spec_Type.DNS, () => 'DNS')
    .otherwise(() => '');
};

const SvcLabel = (props: { children?: React.ReactNode; label?: string }) => {
  return (
    <span
      className={twMerge(
        'mx-1 my-1 flex flex-none flex-shrink flex-row rounded-full p-0 text-xs font-bold',
        'border-[1px] border-gray-400 shadow-md'
      )}
    >
      {props.label && (
        <span className={twMerge(`rounded-s-full bg-gray-800 px-2 py-1 text-white shadow-lg`)}>
          {props.label}
        </span>
      )}
      <span className={twMerge(`flex flex-none px-2 py-1`)}>{props.children}</span>
    </span>
  );
};

const ItemDetails = (props: { item: Service; domain: string }) => {
  const { item } = props;
  const md = item.metadata!;

  return (
    <div>
      {md.description && <InfoItem title="Description">{md.description}</InfoItem>}
      <InfoItem title="Private FQDN">
        <CopyText value={getServicePrivateFQDN(item, props.domain)} />
      </InfoItem>
      {item.spec?.isPublic && (
        <InfoItem title="Public FQDN">
          <CopyText value={getServicePublicFQDN(item, props.domain)} />
        </InfoItem>
      )}
      {item.status?.addresses && item.status.addresses.length > 0 && (
        <InfoItem title="Private Addresses">
          <div className="flex flex-col">
            {item.status?.addresses.map((x) => (
              <span className="w-full">
                <CopyText value={x} />
              </span>
            ))}
          </div>
        </InfoItem>
      )}
    </div>
  );
};

const Item = (props: { item: Service; domain: string; skipNS?: boolean }) => {
  const { item } = props;

  const md = item.metadata!;

  let [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      className="w-full font-semibold"
      onMouseEnter={() => {
        setShowDetails(true);
      }}
      onMouseLeave={() => {
        setShowDetails(false);
      }}
    >
      <div className="flex items-start">
        <div className="mr-3 flex h-[40px] w-[40px] flex-col items-center justify-center rounded-[50%] bg-zinc-900 p-4 font-extrabold text-white shadow-md md:h-[60px] md:w-[60px] md:text-4xl">
          {getTypeIcon(item)}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center font-bold">
            <Text className="mr-2 flex flex-row" size="sm" fw={'bold'}>
              <CopyText value={item.status?.primaryHostname ?? item.metadata!.name} />

              {md.displayName && (
                <Text className="ml-3" c="gray.7" inherit>
                  {md.displayName}
                </Text>
              )}
            </Text>
          </div>
          <div className="mt-1 flex w-full flex-row">
            <ResourceListLabel label="Type">{getType(item)}</ResourceListLabel>
            {!props.skipNS && (
              <ResourceListLabel label="Namespace"> {item.status?.namespace}</ResourceListLabel>
            )}
            <ResourceListLabel label="Port">{item.spec?.port}</ResourceListLabel>
            {/*
            <SvcLabel label="Namespace"> {item.metadata?.namespace}</SvcLabel>
            <SvcLabel label="Hostname">{getHostName(item)}</SvcLabel>
            */}
            {item.spec?.isTLS && <ResourceListLabel>TLS</ResourceListLabel>}
          </div>

          <Collapse in={showDetails} transitionDuration={500}>
            <ItemDetails item={item} domain={props.domain} />
          </Collapse>
        </div>
        <div className="flex items-center justify-center">
          {item.spec?.isPublic && item.spec.type === Service_Spec_Type.WEB && (
            <a
              className={twMerge(
                'ml-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-white shadow-lg',
                'shadow-xl transition-all duration-200 hover:bg-black',
                'flex flex-row items-center justify-center'
              )}
              href={`https://${getServicePublicFQDN(item, props.domain)}`}
              target="_blank"
            >
              <span className="px-1">Visit</span>
              <BiLinkExternal />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const ServiceListC = (props: { itemsList: ServiceList }) => {
  let [searchParams, _] = useSearchParams();
  const path = searchParams.has('namespace')
    ? `/services?namespace=${searchParams.get('namespace')}`
    : `/services`;

  const domain = getDomain();

  return (
    <div>
      <Paginator meta={props.itemsList.listResponseMeta!} path={path} />

      <ResourceListWrapper>
        {props.itemsList.items.length === 0 && <EmptyList title="No Services Found"></EmptyList>}
        {props.itemsList.items.map((item) => (
          <ResourceListItem key={item.metadata!.uid}>
            <Item item={item} domain={domain} skipNS={searchParams.has('namespace')} />
          </ResourceListItem>
        ))}
      </ResourceListWrapper>

      <Paginator meta={props.itemsList.listResponseMeta!} path={path} />
    </div>
  );
};

const Page = () => {
  const settings = useAppSelector((state) => state.settings);

  let [searchParams, _] = useSearchParams();
  const page = toNumOrZero(searchParams.get('page'));
  const hasNS = searchParams.has('namespace');
  const navigate = useNavigate();

  let opts = parseQuery<{ common: { page: number; itemsPerPage?: number } }>(
    searchParams.toString()
  );
  if (opts.common && opts.common.page && opts.common.page > 0) {
    opts.common.page = opts.common.page - 1;
  }

  let o = ListServiceOptions.fromJsonString(JSON.stringify(opts));
  ListServiceOptions.mergePartial(o, {
    common: {
      itemsPerPage: settings.itemsPerPage,
    },
  });

  const qry = useQuery({
    queryKey: ['user/main.listService', ListServiceOptions.toJsonString(o)],
    queryFn: async () => {
      return await getClientUser().listService(o);
    },
  });

  const qryNS = useQuery({
    queryKey: ['user/main.listNamespace', ListServiceOptions.toJsonString(o)],
    queryFn: async () => {
      return await getClientUser().listNamespace(ListNamespaceOptions.create());
    },
  });

  return (
    <>
      <title>Services - Octelium Portal</title>
      <div className="mb-6 mt-4">
        <div
          className={twMerge('text-3xl font-bold text-gray-800')}
          style={{
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          Services
        </div>
      </div>
      <div>
        {qryNS.isSuccess && qryNS.data && qryNS.data.response.items.length > 0 && (
          <div className="mb-4">
            <div className="font-bold text-gray-700">Filter by Namespace</div>
            <div className="flex flex-row items-center">
              <Button
                size="xs"
                variant="outline"
                className="mr-2 transition-all duration-500"
                onClick={() => {
                  navigate('/services');
                }}
              >
                All Namespaces
              </Button>
              {qryNS.data.response.items
                .filter((x) => x.metadata!.name !== 'octelium')
                .map((x) => (
                  <Button
                    size="xs"
                    key={x.metadata!.name}
                    variant={
                      searchParams.get('namespace') === x.metadata?.name ? undefined : 'outline'
                    }
                    className="mr-2 shadow-md"
                    onClick={() => {
                      navigate(`/services?namespace=${x.metadata!.name}`);
                    }}
                  >
                    {printResourceNameWithDisplay(x.metadata!)}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </div>
      {qry.isSuccess && qry.data && <ServiceListC itemsList={qry.data.response} />}
    </>
  );
};

export default Page;
